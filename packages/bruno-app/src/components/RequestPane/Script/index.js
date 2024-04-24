import React, { useEffect } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import { updateRequestScript, updateResponseScript } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import StyledWrapper from './StyledWrapper';

const Script = ({ item, collection }) => {
  const dispatch = useDispatch();
  const requestScript = item.draft ? get(item, 'draft.request.script.req') : get(item, 'request.script.req');
  const responseScript = item.draft ? get(item, 'draft.request.script.res') : get(item, 'request.script.res');

  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const isResponsePaneDockedToBottom = useSelector(
    (state) => state.app.preferences.userInterface.responsePaneDockedToBottom
  );

  const updateCodeMirrorHeight = (parentId, offsetTop, dockRightHeight) => {
    const codeMirror = document.querySelectorAll(parentId + ' .CodeMirror');
    const pane = document.querySelector('.request-pane');
    if (codeMirror !== null && pane !== null) {
      codeMirror.forEach((control) => {
        let newHeight;

        if (isResponsePaneDockedToBottom) {
          newHeight = (pane.offsetHeight - offsetTop) / 2 + 'px';
        } else {
          newHeight = dockRightHeight;
        }
        if (newHeight !== control.style.height) {
          control.style.height = newHeight;
        }
      });
    }
  };

  useEffect(() => {
    updateCodeMirrorHeight('#request-script-tab', 125, 'calc((100vh - 280px) / 2');
  });

  const onRequestScriptEdit = (value) => {
    dispatch(
      updateRequestScript({
        script: value,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const onResponseScriptEdit = (value) => {
    dispatch(
      updateResponseScript({
        script: value,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const onRun = () => dispatch(sendRequest(item, collection.uid));
  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));

  return (
    <StyledWrapper id="request-script-tab" className="w-full">
      <div className="flex flex-col">
        <div className="flex-1 mt-2">
          <div className="mb-1 title text-xs">Pre Request</div>
          <CodeEditor
            collection={collection}
            value={requestScript || ''}
            theme={displayedTheme}
            font={get(preferences, 'font.codeFont', 'default')}
            onEdit={onRequestScriptEdit}
            mode="javascript"
            onRun={onRun}
            onSave={onSave}
          />
        </div>
        <div className="flex-1 mt-6">
          <div className="mt-1 mb-1 title text-xs">Post Response</div>
          <CodeEditor
            collection={collection}
            value={responseScript || ''}
            theme={displayedTheme}
            font={get(preferences, 'font.codeFont', 'default')}
            onEdit={onResponseScriptEdit}
            mode="javascript"
            onRun={onRun}
            onSave={onSave}
          />
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Script;
