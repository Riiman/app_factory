
import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/Toast';
import { NOTIFICATION_TYPES } from '../config/constants';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = NOTIFICATION_TYPES.INFO, duration = 3000) => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);

    // Auto remove after duration
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showSuccess = useCallback((message, duration) => {
    addToast(message, NOTIFICATION_TYPES.SUCCESS, duration);
  }, [addToast]);

  const showError = useCallback((message, duration) => {
    addToast(message, NOTIFICATION_TYPES.ERROR, duration);
  }, [addToast]);

  const showWarning = useCallback((message, duration) => {
    addToast(message, NOTIFICATION_TYPES.WARNING, duration);
  }, [addToast]);

  const showInfo = useCallback((message, duration) => {
    addToast(message, NOTIFICATION_TYPES.INFO, duration);
  }, [addToast]);

  const value = {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    addToast,
    removeToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container">
        {toasts.map((toast, index) => (
          <div key={toast.id} style={{ top: `${20 + index * 80}px` }}>
            <Toast
              message={toast.message}
              type={toast.type}
              duration={toast.duration}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
