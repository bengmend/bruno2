import styled from 'styled-components';

const StyledWrapper = styled.div`
  div.CodeMirror {
    /* todo: find a better way */
    height: calc(100vh - 240px);

    .CodeMirror-scroll {
      padding-bottom: 0px;
    }
  }
  .editing-mode {
    cursor: pointer;
    color: ${(props) => props.theme.colors.text.yellow};
  }
  .textbox {
    border: 1px solid #ccc;
    padding: 0.15rem 0.45rem;
    box-shadow: none;
    border-radius: 0px;
    outline: none;
    box-shadow: none;
    transition: border-color ease-in-out 0.1s;
    border-radius: 3px;
    background-color: ${(props) => props.theme.modal.input.bg};
    border: 1px solid ${(props) => props.theme.modal.input.border};

    &:focus {
      border: solid 1px ${(props) => props.theme.modal.input.focusBorder} !important;
      outline: none !important;
    }
  }
`;

export default StyledWrapper;
