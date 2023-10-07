import React, { useState, useEffect, useRef } from 'react';
import StyledWrapper from './StyledWrapper';

const ModalHeader = ({ title, handleCancel }) => (
  <div className="bruno-modal-header">
    {title ? <div className="bruno-modal-header-title">{title}</div> : null}
    {handleCancel ? (
      <div className="close cursor-pointer" onClick={handleCancel ? () => handleCancel() : null}>
        ×
      </div>
    ) : null}
  </div>
);

const ModalContent = ({ children }) => <div className="bruno-modal-content px-4 py-6">{children}</div>;

const ModalFooter = ({
  confirmText,
  cancelText,
  handleSubmit,
  handleCancel,
  confirmDisabled,
  hideCancel,
  hideFooter
}) => {
  confirmText = confirmText || 'Save';
  cancelText = cancelText || 'Cancel';

  if (hideFooter) {
    return null;
  }

  return (
    <div className="flex justify-end p-4 bruno-modal-footer">
      <span className={hideCancel ? 'hidden' : 'mr-2'}>
        <button type="button" onClick={handleCancel} className="btn btn-md btn-close">
          {cancelText}
        </button>
      </span>
      <span>
        <button
          type="submit"
          className="submit btn btn-md btn-secondary"
          disabled={confirmDisabled}
          onClick={handleSubmit}
        >
          {confirmText}
        </button>
      </span>
    </div>
  );
};

const Modal = ({
  size,
  title,
  confirmText,
  cancelText,
  handleCancel,
  handleConfirm,
  children,
  confirmDisabled,
  hideCancel,
  hideFooter
}) => {
  const modalRef = useRef(null);
  const [isClosing, setIsClosing] = useState(false);
  const escFunction = (event) => {
    const escKeyCode = 27;
    if (event.keyCode === escKeyCode) {
      closeModal();
    }
  };

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => handleCancel(), 500);
  };

  useEffect(() => {
    const modalElement = modalRef.current;
    const focusableElements = modalElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    console.log(focusableElements);

    const handleKeyDown = (event) => {
      if (event.key === 'Tab') {
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    modalElement.addEventListener('keydown', handleKeyDown);
    // document.addEventListener('keydown', handleEscapeKeyPress);

    return () => {
      modalElement.removeEventListener('keydown', handleKeyDown);
      // document.removeEventListener('keydown', handleEscapeKeyPress);
    };
  }, []);

  let classes = 'bruno-modal';
  if (isClosing) {
    classes += ' modal--animate-out';
  }
  if (hideFooter) {
    classes += ' modal-footer-none';
  }
  return (
    <StyledWrapper className={classes}>
      <div className={`bruno-modal-card modal-${size}`} ref={modalRef}>
        <ModalHeader title={title} handleCancel={() => closeModal()} />
        <ModalContent>{children}</ModalContent>
        <ModalFooter
          confirmText={confirmText}
          cancelText={cancelText}
          handleCancel={() => closeModal()}
          handleSubmit={handleConfirm}
          confirmDisabled={confirmDisabled}
          hideCancel={hideCancel}
          hideFooter={hideFooter}
        />
      </div>

      {/* Clicking on backdrop closes the modal */}
      <div className="bruno-modal-backdrop" onClick={() => closeModal()} />
    </StyledWrapper>
  );
};

export default Modal;
