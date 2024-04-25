import React from 'react';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import SingleLineEditor from 'components/SingleLineEditor';
import { saveCollectionRoot, sendCollectionOauth2Request } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import { inputsConfig } from './inputsConfig';
import { updateCollectionAuth } from 'providers/ReduxStore/slices/collections';
import ClientCredentialsMethodSelector from 'components/RequestPane/Auth/OAuth2/ClientCredentialsMethodSelector';

const OAuth2ClientCredentials = ({ collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  const oAuth = get(collection, 'root.request.auth.oauth2', {});

  const handleRun = async () => {
    dispatch(sendCollectionOauth2Request(collection.uid));
  };

  const handleSave = () => dispatch(saveCollectionRoot(collection.uid));

  const { accessTokenUrl, clientId, clientSecret, clientSecretMethod, scope } = oAuth;

  const handleChange = (key, value) => {
    dispatch(
      updateCollectionAuth({
        mode: 'oauth2',
        collectionUid: collection.uid,
        content: {
          grantType: 'client_credentials',
          accessTokenUrl,
          clientId,
          clientSecret,
          clientSecretMethod,
          scope,
          [key]: value
        }
      })
    );
  };

  return (
    <StyledWrapper className="mt-2 flex w-full gap-4 flex-col">
      {inputsConfig.map((input) => {
        const { key, label } = input;
        return (
          <div className="flex flex-col w-full gap-1" key={`input-${key}`}>
            <label className="block font-medium">{label}</label>
            <div className="single-line-editor-wrapper">
              <SingleLineEditor
                value={oAuth[key] || ''}
                theme={storedTheme}
                onSave={handleSave}
                onChange={(val) => handleChange(key, val)}
                onRun={handleRun}
                collection={collection}
              />
            </div>
          </div>
        );
      })}
      <ClientCredentialsMethodSelector collection={collection} oAuth={oAuth} />
    </StyledWrapper>
  );
};

export default OAuth2ClientCredentials;
