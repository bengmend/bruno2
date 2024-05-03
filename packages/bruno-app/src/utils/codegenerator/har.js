const createContentType = (mode) => {
  switch (mode) {
    case 'json':
      return 'application/json';
    case 'xml':
      return 'application/xml';
    case 'formUrlEncoded':
      return 'application/x-www-form-urlencoded';
    case 'multipartForm':
      return 'multipart/form-data';
    default:
      return '';
  }
};

const createHeaders = (headers) => {
  return headers
    .filter((header) => header.enabled)
    .map((header) => ({
      name: header.name,
      value: header.value
    }));
};

const createQuery = (queryParams = []) => {
  return queryParams
    .filter((param) => param.enabled)
    .map((param) => ({
      name: param.name,
      value: param.value
    }));
};

const createPostData = (body, { target, client }) => {
  const contentType = createContentType(body.mode);
  if (body.mode === 'formUrlEncoded' || body.mode === 'multipartForm') {
    return {
      mimeType: contentType,
      params: body[body.mode]
        .filter((param) => param.enabled)
        .map(({ name, value, type }) => {
          if (body.mode === 'multipartForm' && type === 'file' && target === 'shell' && client === 'curl') {
            return {
              name,
              fileName: value
            };
          }

          return {
            name,
            value
          };
        })
    };
  } else {
    return {
      mimeType: contentType,
      text: body[body.mode]
    };
  }
};

export const buildHarRequest = ({ request, headers, target, client }) => {
  return {
    method: request.method,
    url: encodeURI(request.url),
    httpVersion: 'HTTP/1.1',
    cookies: [],
    headers: createHeaders(headers),
    queryString: createQuery(request.params),
    postData: createPostData(request.body, { target, client }),
    headersSize: 0,
    bodySize: 0
  };
};
