import { useState, useEffect } from 'react';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX, FiAlertTriangle } from 'react-icons/fi';

function AlertOverlay({ 
  type = 'success', 
  message = '', 
  duration = 5000, 
  onClose, 
  show = false 
}) {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    setIsVisible(show);
  }, [show]);

  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  const getAlertConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: FiCheckCircle,
          bgColor: 'bg-green-50',
          iconColor: 'text-green-600',
          textColor: 'text-green-800',
          borderColor: 'border-green-200'
        };
      case 'error':
        return {
          icon: FiAlertCircle,
          bgColor: 'bg-red-50',
          iconColor: 'text-red-600',
          textColor: 'text-red-800',
          borderColor: 'border-red-200'
        };
      case 'warning':
        return {
          icon: FiAlertTriangle,
          bgColor: 'bg-yellow-50',
          iconColor: 'text-yellow-600',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200'
        };
      case 'info':
      default:
        return {
          icon: FiInfo,
          bgColor: 'bg-blue-50',
          iconColor: 'text-blue-600',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200'
        };
    }
  };

  const config = getAlertConfig();

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => {
        setIsVisible(false);
        if (onClose) onClose();
      }} />
      <div className={`relative w-full max-w-md ${config.bgColor} ${config.borderColor} border-2 rounded-2xl shadow-2xl p-6 animate-scale-in`}>
        <button
          onClick={() => {
            setIsVisible(false);
            if (onClose) onClose();
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <FiX className="w-5 h-5" />
        </button>
        
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-12 h-12 ${config.iconColor} bg-white rounded-full flex items-center justify-center shadow-sm`}>
            <config.icon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className={`font-semibold text-lg ${config.textColor} mb-1`}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </h3>
            <p className={`text-sm ${config.textColor} opacity-90`}>
              {message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AlertOverlay;