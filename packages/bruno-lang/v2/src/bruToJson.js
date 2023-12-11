const ohm = require('ohm-js');
const _ = require('lodash');
const { outdentString } = require('../../v1/src/utils');
const { decodeString } = require('./encoder');

/**
 * A Bru file is made up of blocks.
 * There are two types of blocks
 *
 * 1. Dictionary Blocks - These are blocks that have key value pairs
 * ex:
 *  headers {
 *   content-type: application/json
 *  }
 *
 * 2. Text Blocks - These are blocks that have text
 * ex:
 * body:json {
 *  {
 *   "username": "John Nash",
 *   "password": "governingdynamics
 *  }
 *
 */
const grammar = ohm.grammar(`Bru {
  BruFile = (meta | http | query | headers | auths | bodies | varsandassert | script | tests | docs)*
  auths = authawsv4 | authbasic | authbearer | authdigest 
  bodies = bodyjson | bodytext | bodyxml | bodysparql | bodygraphql | bodygraphqlvars | bodyforms | body
  bodyforms = bodyformurlencoded | bodymultipart

  nl = "\\r"? "\\n"
  st = " " | "\\t"
  stnl = st | nl
  tagend = nl "}"
  optionalnl = ~tagend nl
  keychar = ~(tagend | st | nl | ":") any
  valuechar = ~(nl | tagend) any

  // Dictionary Blocks
  dictionary = st* "{" pairlist? tagend
  pairlist = optionalnl* pair (~tagend stnl* pair)* (~tagend space)*
  pair = st* key st* ":" st* value st*
  key = keychar*
  value = valuechar*
  
  // Dictionary for Assert Block
  assertdictionary = st* "{" assertpairlist? tagend
  assertpairlist = optionalnl* assertpair (~tagend stnl* assertpair)* (~tagend space)*
  assertpair = st* assertkey st* ":" st* value st*
  assertkey = ~tagend assertkeychar*
  assertkeychar = ~(tagend | nl | ":") any

  // Text Blocks
  textblock = textline (~tagend nl textline)*
  textline = textchar*
  textchar = ~nl any

  meta = "meta" dictionary

  http = get | post | put | delete | patch | options | head | connect | trace
  get = "get" dictionary
  post = "post" dictionary
  put = "put" dictionary
  delete = "delete" dictionary
  patch = "patch" dictionary
  options = "options" dictionary
  head = "head" dictionary
  connect = "connect" dictionary
  trace = "trace" dictionary

  headers = "headers" dictionary

  query = "query" dictionary

  varsandassert = varsreq | varsres | assert
  varsreq = "vars:pre-request" dictionary
  varsres = "vars:post-response" dictionary
  assert = "assert" assertdictionary

  authawsv4 = "auth:awsv4" dictionary
  authbasic = "auth:basic" dictionary
  authbearer = "auth:bearer" dictionary
  authdigest = "auth:digest" dictionary

  body = "body" st* "{" nl* textblock tagend
  bodyjson = "body:json" st* "{" nl* textblock tagend
  bodytext = "body:text" st* "{" nl* textblock tagend
  bodyxml = "body:xml" st* "{" nl* textblock tagend
  bodysparql = "body:sparql" st* "{" nl* textblock tagend
  bodygraphql = "body:graphql" st* "{" nl* textblock tagend
  bodygraphqlvars = "body:graphql:vars" st* "{" nl* textblock tagend

  bodyformurlencoded = "body:form-urlencoded" dictionary
  bodymultipart = "body:multipart-form" dictionary

  script = scriptreq | scriptres
  scriptreq = "script:pre-request" st* "{" nl* textblock tagend
  scriptres = "script:post-response" st* "{" nl* textblock tagend
  tests = "tests" st* "{" nl* textblock tagend
  docs = "docs" st* "{" nl* textblock tagend
}`);

const mapPairListToKeyValPairs = (pairList = [], parseEnabled = true) => {
  if (!pairList.length) {
    return [];
  }
  return _.map(pairList[0], (pair) => {
    const rawKey = _.keys(pair)[0];
    const value = decodeString(pair[rawKey]);
    let name = decodeString(rawKey);

    if (!parseEnabled) {
      return {
        name,
        value
      };
    }

    let enabled = true;
    if (name && name.length && name.charAt(0) === '~') {
      name = name.slice(1);
      enabled = false;
    }

    return {
      name,
      value,
      enabled
    };
  });
};

const concatArrays = (objValue, srcValue) => {
  if (_.isArray(objValue) && _.isArray(srcValue)) {
    return objValue.concat(srcValue);
  }
};

const mapPairListToKeyValPair = (pairList = []) => {
  if (!pairList || !pairList.length) {
    return {};
  }

  return _.merge({}, ...pairList[0]);
};

const sem = grammar.createSemantics().addAttribute('ast', {
  BruFile(tags) {
    if (!tags || !tags.ast || !tags.ast.length) {
      return {};
    }

    return _.reduce(
      tags.ast,
      (result, item) => {
        return _.mergeWith(result, item, concatArrays);
      },
      {}
    );
  },
  dictionary(_1, _2, pairlist, _3) {
    return pairlist.ast;
  },
  pairlist(_1, pair, _2, rest, _3) {
    return [pair.ast, ...rest.ast];
  },
  pair(_1, key, _2, _3, _4, value, _5) {
    let res = {};
    res[key.ast] = value.ast ? value.ast.trim() : '';
    return res;
  },
  key(chars) {
    return chars.sourceString ? chars.sourceString.trim() : '';
  },
  value(chars) {
    return chars.sourceString ? chars.sourceString.trim() : '';
  },
  assertdictionary(_1, _2, pairlist, _3) {
    return pairlist.ast;
  },
  assertpairlist(_1, pair, _2, rest, _3) {
    return [pair.ast, ...rest.ast];
  },
  assertpair(_1, key, _2, _3, _4, value, _5) {
    let res = {};
    res[key.ast] = value.ast ? value.ast.trim() : '';
    return res;
  },
  assertkey(chars) {
    return chars.sourceString ? chars.sourceString.trim() : '';
  },
  textblock(line, _1, rest) {
    return [line.ast, ...rest.ast].join('\n');
  },
  textline(chars) {
    return chars.sourceString;
  },
  textchar(char) {
    return char.sourceString;
  },
  nl(_1, _2) {
    return '';
  },
  st(_) {
    return '';
  },
  tagend(_1, _2) {
    return '';
  },
  _iter(...elements) {
    return elements.map((e) => e.ast);
  },
  meta(_1, dictionary) {
    let meta = mapPairListToKeyValPair(dictionary.ast);

    if (!meta.seq) {
      meta.seq = 1;
    }

    if (!meta.type) {
      meta.type = 'http';
    }

    return {
      meta
    };
  },
  get(_1, dictionary) {
    return {
      http: {
        method: 'get',
        ...mapPairListToKeyValPair(dictionary.ast)
      }
    };
  },
  post(_1, dictionary) {
    return {
      http: {
        method: 'post',
        ...mapPairListToKeyValPair(dictionary.ast)
      }
    };
  },
  put(_1, dictionary) {
    return {
      http: {
        method: 'put',
        ...mapPairListToKeyValPair(dictionary.ast)
      }
    };
  },
  delete(_1, dictionary) {
    return {
      http: {
        method: 'delete',
        ...mapPairListToKeyValPair(dictionary.ast)
      }
    };
  },
  patch(_1, dictionary) {
    return {
      http: {
        method: 'patch',
        ...mapPairListToKeyValPair(dictionary.ast)
      }
    };
  },
  options(_1, dictionary) {
    return {
      http: {
        method: 'options',
        ...mapPairListToKeyValPair(dictionary.ast)
      }
    };
  },
  head(_1, dictionary) {
    return {
      http: {
        method: 'head',
        ...mapPairListToKeyValPair(dictionary.ast)
      }
    };
  },
  connect(_1, dictionary) {
    return {
      http: {
        method: 'connect',
        ...mapPairListToKeyValPair(dictionary.ast)
      }
    };
  },
  query(_1, dictionary) {
    return {
      query: mapPairListToKeyValPairs(dictionary.ast)
    };
  },
  headers(_1, dictionary) {
    return {
      headers: mapPairListToKeyValPairs(dictionary.ast)
    };
  },
  authawsv4(_1, dictionary) {
    const auth = mapPairListToKeyValPairs(dictionary.ast, false);
    const accessKeyIdKey = _.find(auth, { name: 'accessKeyId' });
    const secretAccessKeyKey = _.find(auth, { name: 'secretAccessKey' });
    const sessionTokenKey = _.find(auth, { name: 'sessionToken' });
    const serviceKey = _.find(auth, { name: 'service' });
    const regionKey = _.find(auth, { name: 'region' });
    const profileNameKey = _.find(auth, { name: 'profileName' });
    const accessKeyId = accessKeyIdKey ? accessKeyIdKey.value : '';
    const secretAccessKey = secretAccessKeyKey ? secretAccessKeyKey.value : '';
    const sessionToken = sessionTokenKey ? sessionTokenKey.value : '';
    const service = serviceKey ? serviceKey.value : '';
    const region = regionKey ? regionKey.value : '';
    const profileName = profileNameKey ? profileNameKey.value : '';
    return {
      auth: {
        awsv4: {
          accessKeyId,
          secretAccessKey,
          sessionToken,
          service,
          region,
          profileName
        }
      }
    };
  },
  authbasic(_1, dictionary) {
    const auth = mapPairListToKeyValPairs(dictionary.ast, false);
    const usernameKey = _.find(auth, { name: 'username' });
    const passwordKey = _.find(auth, { name: 'password' });
    const username = usernameKey ? usernameKey.value : '';
    const password = passwordKey ? passwordKey.value : '';
    return {
      auth: {
        basic: {
          username,
          password
        }
      }
    };
  },
  authbearer(_1, dictionary) {
    const auth = mapPairListToKeyValPairs(dictionary.ast, false);
    const tokenKey = _.find(auth, { name: 'token' });
    const token = tokenKey ? tokenKey.value : '';
    return {
      auth: {
        bearer: {
          token
        }
      }
    };
  },
  authdigest(_1, dictionary) {
    const auth = mapPairListToKeyValPairs(dictionary.ast, false);
    const usernameKey = _.find(auth, { name: 'username' });
    const passwordKey = _.find(auth, { name: 'password' });
    const username = usernameKey ? usernameKey.value : '';
    const password = passwordKey ? passwordKey.value : '';
    return {
      auth: {
        digest: {
          username,
          password
        }
      }
    };
  },
  bodyformurlencoded(_1, dictionary) {
    return {
      body: {
        formUrlEncoded: mapPairListToKeyValPairs(dictionary.ast)
      }
    };
  },
  bodymultipart(_1, dictionary) {
    return {
      body: {
        multipartForm: mapPairListToKeyValPairs(dictionary.ast)
      }
    };
  },
  body(_1, _2, _3, _4, textblock, _5) {
    return {
      http: {
        body: 'json'
      },
      body: {
        json: outdentString(textblock.sourceString)
      }
    };
  },
  bodyjson(_1, _2, _3, _4, textblock, _5) {
    return {
      body: {
        json: outdentString(textblock.sourceString)
      }
    };
  },
  bodytext(_1, _2, _3, _4, textblock, _5) {
    return {
      body: {
        text: outdentString(textblock.sourceString)
      }
    };
  },
  bodyxml(_1, _2, _3, _4, textblock, _5) {
    return {
      body: {
        xml: outdentString(textblock.sourceString)
      }
    };
  },
  bodysparql(_1, _2, _3, _4, textblock, _5) {
    return {
      body: {
        sparql: outdentString(textblock.sourceString)
      }
    };
  },
  bodygraphql(_1, _2, _3, _4, textblock, _5) {
    return {
      body: {
        graphql: {
          query: outdentString(textblock.sourceString)
        }
      }
    };
  },
  bodygraphqlvars(_1, _2, _3, _4, textblock, _5) {
    return {
      body: {
        graphql: {
          variables: outdentString(textblock.sourceString)
        }
      }
    };
  },
  varsreq(_1, dictionary) {
    const vars = mapPairListToKeyValPairs(dictionary.ast);
    _.each(vars, (v) => {
      let name = v.name;
      if (name && name.length && name.charAt(0) === '@') {
        v.name = name.slice(1);
        v.local = true;
      } else {
        v.local = false;
      }
    });

    return {
      vars: {
        req: vars
      }
    };
  },
  varsres(_1, dictionary) {
    const vars = mapPairListToKeyValPairs(dictionary.ast);
    _.each(vars, (v) => {
      let name = v.name;
      if (name && name.length && name.charAt(0) === '@') {
        v.name = name.slice(1);
        v.local = true;
      } else {
        v.local = false;
      }
    });

    return {
      vars: {
        res: vars
      }
    };
  },
  assert(_1, dictionary) {
    return {
      assertions: mapPairListToKeyValPairs(dictionary.ast)
    };
  },
  scriptreq(_1, _2, _3, _4, textblock, _5) {
    return {
      script: {
        req: outdentString(textblock.sourceString)
      }
    };
  },
  scriptres(_1, _2, _3, _4, textblock, _5) {
    return {
      script: {
        res: outdentString(textblock.sourceString)
      }
    };
  },
  tests(_1, _2, _3, _4, textblock, _5) {
    return {
      tests: outdentString(textblock.sourceString)
    };
  },
  docs(_1, _2, _3, _4, textblock, _5) {
    return {
      docs: outdentString(textblock.sourceString)
    };
  }
});

const parser = (input) => {
  const match = grammar.match(input);

  if (match.succeeded()) {
    return sem(match).ast;
  } else {
    throw new Error(match.message);
  }
};

module.exports = parser;
