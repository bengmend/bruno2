/**
 *  Copyright (c) 2021 GraphQL Contributors.
 *
 *  This source code is licensed under the MIT license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import isEqual from 'lodash/isEqual';
import MD from 'markdown-it';
import { getAllVariables } from 'utils/collections';
import { defineCodeMirrorBrunoVariablesMode } from 'utils/common/codemirror';
import StyledWrapper from './StyledWrapper';

import onHasCompletion from './onHasCompletion';

let CodeMirror;
const SERVER_RENDERED = typeof navigator === 'undefined' || global['PREVENT_CODEMIRROR_RENDER'] === true;

if (!SERVER_RENDERED) {
  CodeMirror = require('codemirror');
}

const md = new MD();
const AUTO_COMPLETE_AFTER_KEY = /^[a-zA-Z0-9_@(]$/;

export default class QueryEditor extends React.Component {
  constructor(props) {
    super(props);

    // Keep a cached version of the value, this cache will be updated when the
    // editor is updated, which can later be used to protect the editor from
    // unnecessary updates during the update lifecycle.
    this.cachedValue = props.value || '';
    this.variables = {};
  }

  componentDidMount() {
    const editor = (this.editor = CodeMirror(this._node, {
      value: this.props.value || '',
      lineNumbers: true,
      tabSize: 2,
      mode: 'graphql',
      // mode: 'brunovariables',
      brunoVarInfo: {
        variables: getAllVariables(this.props.collection)
      },
      theme: this.props.editorTheme || 'graphiql',
      theme: this.props.theme === 'dark' ? 'monokai' : 'default',
      keyMap: 'sublime',
      autoCloseBrackets: true,
      matchBrackets: true,
      showCursorWhenSelecting: true,
      scrollbarStyle: 'overlay',
      readOnly: this.props.readOnly ? 'nocursor' : false,
      foldGutter: {
        minFoldSize: 4
      },
      lint: {
        schema: this.props.schema,
        validationRules: this.props.validationRules ?? null,
        // linting accepts string or FragmentDefinitionNode[]
        externalFragments: this.props?.externalFragments
      },
      hintOptions: {
        schema: this.props.schema,
        closeOnUnfocus: false,
        completeSingle: false,
        container: this._node,
        externalFragments: this.props?.externalFragments
      },
      info: {
        schema: this.props.schema,
        renderDescription: (text) => md.render(text),
        onClick: (reference) => this.props.onClickReference && this.props.onClickReference(reference)
      },
      jump: {
        schema: this.props.schema,
        onClick: (reference) => this.props.onClickReference && this.props.onClickReference(reference)
      },
      gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
      extraKeys: {
        'Cmd-Space': () => editor.showHint({ completeSingle: true, container: this._node }),
        'Ctrl-Space': () => editor.showHint({ completeSingle: true, container: this._node }),
        'Alt-Space': () => editor.showHint({ completeSingle: true, container: this._node }),
        'Shift-Space': () => editor.showHint({ completeSingle: true, container: this._node }),
        'Shift-Alt-Space': () => editor.showHint({ completeSingle: true, container: this._node }),
        'Cmd-Enter': () => {
          if (this.props.onRun) {
            this.props.onRun();
          }
        },
        'Ctrl-Enter': () => {
          if (this.props.onRun) {
            this.props.onRun();
          }
        },
        'Shift-Ctrl-C': () => {
          if (this.props.onCopyQuery) {
            this.props.onCopyQuery();
          }
        },
        'Shift-Ctrl-P': () => {
          if (this.props.onPrettifyQuery) {
            this.props.onPrettifyQuery();
          }
        },
        /* Shift-Ctrl-P is hard coded in Firefox for private browsing so adding an alternative to Pretiffy */
        'Shift-Ctrl-F': () => {
          if (this.props.onPrettifyQuery) {
            this.props.onPrettifyQuery();
          }
        },
        'Shift-Ctrl-M': () => {
          if (this.props.onMergeQuery) {
            this.props.onMergeQuery();
          }
        },
        'Cmd-S': () => {
          if (this.props.onSave) {
            this.props.onSave();
            return false;
          }
        },
        'Ctrl-S': () => {
          if (this.props.onSave) {
            this.props.onSave();
            return false;
          }
        },
        'Cmd-F': 'findPersistent',
        'Ctrl-F': 'findPersistent'
      }
    }));
    if (editor) {
      editor.on('change', this._onEdit);
      editor.on('keyup', this._onKeyUp);
      editor.on('hasCompletion', this._onHasCompletion);
      editor.on('beforeChange', this._onBeforeChange);
    }
    this.addOverlay();
  }

  componentDidUpdate(prevProps) {
    // Ensure the changes caused by this update are not interpreted as
    // user-input changes which could otherwise result in an infinite
    // event loop.
    this.ignoreChangeEvent = true;
    if (this.props.schema !== prevProps.schema && this.editor) {
      this.editor.options.lint.schema = this.props.schema;
      this.editor.options.hintOptions.schema = this.props.schema;
      this.editor.options.info.schema = this.props.schema;
      this.editor.options.jump.schema = this.props.schema;
      CodeMirror.signal(this.editor, 'change', this.editor);
    }
    if (this.props.value !== prevProps.value && this.props.value !== this.cachedValue && this.editor) {
      this.cachedValue = this.props.value;
      this.editor.setValue(this.props.value);
    }

    if (this.props.theme !== prevProps.theme && this.editor) {
      this.editor.setOption('theme', this.props.theme === 'dark' ? 'monokai' : 'default');
    }
    let variables = getAllVariables(this.props.collection);
    if (!isEqual(variables, this.variables)) {
      this.editor.options.brunoVarInfo.variables = variables;
      this.addOverlay();
    }
    this.ignoreChangeEvent = false;
  }

  componentWillUnmount() {
    if (this.editor) {
      this.editor.off('change', this._onEdit);
      this.editor.off('keyup', this._onKeyUp);
      this.editor.off('hasCompletion', this._onHasCompletion);
      this.editor = null;
    }
  }

  // Todo: Overlay is messing up with schema hint
  // Fix this
  addOverlay = () => {
    // let variables = getAllVariables(this.props.collection);
    // this.variables = variables;
    // defineCodeMirrorBrunoVariablesMode(variables, 'graphql');
    // this.editor.setOption('mode', 'brunovariables');
  };

  render() {
    return (
      <StyledWrapper
        className="h-full w-full"
        aria-label="Query Editor"
        fontSize={this.props.fontSize}
        ref={(node) => {
          this._node = node;
        }}
      />
    );
  }

  _onKeyUp = (_cm, e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) {
      return;
    }
    if (AUTO_COMPLETE_AFTER_KEY.test(e.key) && this.editor) {
      this.editor.execCommand('autocomplete');
    }
  };

  _onEdit = () => {
    if (!this.ignoreChangeEvent && this.editor) {
      this.cachedValue = this.editor.getValue();
      if (this.props.onEdit) {
        this.props.onEdit(this.cachedValue);
      }
    }
  };

  /**
   * Render a custom UI for CodeMirror's hint which includes additional info
   * about the type and description for the selected context.
   */
  _onHasCompletion = (cm, data) => {
    onHasCompletion(cm, data, this.props.onHintInformationRender);
  };

  _onBeforeChange(_instance, change) {
    const normalizeWhitespace = (line) => {
      // Unicode whitespace characters that break the interface.
      const invalidCharacters = Array.from({ length: 11 }, (_, i) => {
        // \u2000 -> \u200a
        return String.fromCharCode(0x2000 + i);
      }).concat(['\u2028', '\u2029', '\u202f', '\u00a0']);

      const sanitizeRegex = new RegExp('[' + invalidCharacters.join('') + ']', 'g');
      return line.replace(sanitizeRegex, ' ');
    };

    // The update function is only present on non-redo, non-undo events.
    if (change.origin === 'paste') {
      const text = change.text.map(normalizeWhitespace);
      change.update(change.from, change.to, text);
    }
  }
}
