import { useState, useCallback } from 'react';

function useAlert() {
  const [alert, setAlert] = useState({
    show: false,
    type: 'success',
    message: '',
  });

  const showAlert = useCallback((type, message, duration = 5000) => {
    setAlert({
      show: true,
      type,
      message,
    });

    if (duration > 0) {
      setTimeout(() => {
        setAlert(prev => ({ ...prev, show: false }));
      }, duration);
    }
  }, []);

  const hideAlert = useCallback(() => {
    setAlert(prev => ({ ...prev, show: false }));
  }, []);

  const showSuccess = useCallback((message, duration) => {
    showAlert('success', message, duration);
  }, [showAlert]);

  const showError = useCallback((message, duration) => {
    showAlert('error', message, duration);
  }, [showAlert]);

  const showWarning = useCallback((message, duration) => {
    showAlert('warning', message, duration);
  }, [showAlert]);

  const showInfo = useCallback((message, duration) => {
    showAlert('info', message, duration);
  }, [showAlert]);

  return {
    alert,
    showAlert,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}

export default useAlert;