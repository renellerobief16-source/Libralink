import { useState, useEffect } from 'react';
import { FiAlertTriangle, FiX, FiCheck, FiXCircle } from 'react-icons/fi';

function ConfirmationOverlay({ 
  show = false, 
  title = 'Confirm Action', 
  message = '', 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  type = 'danger',
  onConfirm, 
  onCancel 
}) {
  const [isVisible, setIsVisible] = useState(show);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      setTimeout(() => setIsVisible(false), 300);
    }
  }, [show]);

  const getConfirmConfig = () => {
    switch (type) {
      case 'danger':
        return {
          icon: FiAlertTriangle,
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          confirmBg: 'bg-red-600 hover:bg-red-700',
          confirmText: 'text-white',
          borderColor: 'border-red-200'
        };
      case 'warning':
        return {
          icon: FiAlertTriangle,
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          confirmBg: 'bg-yellow-600 hover:bg-yellow-700',
          confirmText: 'text-white',
          borderColor: 'border-yellow-200'
        };
      case 'success':
        return {
          icon: FiCheck,
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          confirmBg: 'bg-green-600 hover:bg-green-700',
          confirmText: 'text-white',
          borderColor: 'border-green-200'
        };
      case 'info':
      default:
        return {
          icon: FiAlertTriangle,
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          confirmBg: 'bg-blue-600 hover:bg-blue-700',
          confirmText: 'text-white',
          borderColor: 'border-blue-200'
        };
    }
  };

  const config = getConfirmConfig();

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/35 backdrop-blur-[1px] transition-opacity duration-200 ease-out" onClick={() => {
        setIsVisible(false);
        if (onCancel) onCancel();
      }} />
      <div className={`relative w-full max-w-md ${config.borderColor} border rounded-2xl shadow-[0_18px_45px_rgba(15,23,42,0.18)] p-6 bg-white transition-all duration-200 ease-out transform ${isAnimating ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-[0.98] opacity-0'}`}>
        <button
          onClick={() => {
            setIsVisible(false);
            if (onCancel) onCancel();
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <FiX className="w-5 h-5" />
        </button>
        
        <div className="flex items-start gap-4 mb-6">
          <div className={`flex-shrink-0 w-12 h-12 ${config.iconBg} rounded-full flex items-center justify-center`}>
            <config.icon className={`w-5 h-5 ${config.iconColor}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1.5">{title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => {
              setIsVisible(false);
              if (onCancel) onCancel();
            }}
            className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all duration-150 font-medium flex items-center justify-center gap-2"
          >
            <FiXCircle className="w-4 h-4" />
            {cancelText}
          </button>
          <button
            onClick={() => {
              setIsVisible(false);
              if (onConfirm) onConfirm();
            }}
            className={`flex-1 px-4 py-2.5 ${config.confirmBg} ${config.confirmText} rounded-xl transition-all duration-150 font-medium flex items-center justify-center gap-2`}
          >
            <FiCheck className="w-4 h-4" />
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationOverlay;