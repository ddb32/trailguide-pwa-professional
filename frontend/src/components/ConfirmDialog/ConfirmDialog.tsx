import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';

type ConfirmDialogType = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  type?: ConfirmDialogType;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText, 
  cancelText, 
  isLoading = false,
  type = 'danger'
}) => {
  const { t } = useTranslation();
  const { isRTL, conditionalClass, languageClasses } = useLanguageDirection();

  if (!isOpen) return null;

  const typeStyles = {
    danger: {
      icon: '⚠️',
      confirmButton: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 hover:shadow-lg hover:shadow-red-500/25',
      iconBg: 'bg-red-50 ring-1 ring-red-100'
    },
    warning: {
      icon: '⚠️', 
      confirmButton: 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500 hover:shadow-lg hover:shadow-orange-500/25',
      iconBg: 'bg-orange-50 ring-1 ring-orange-100'
    },
    info: {
      icon: 'ℹ️',
      confirmButton: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 hover:shadow-lg hover:shadow-blue-500/25', 
      iconBg: 'bg-blue-50 ring-1 ring-blue-100'
    },
    success: {
      icon: '✅',
      confirmButton: 'bg-green-600 hover:bg-green-700 focus:ring-green-500 hover:shadow-lg hover:shadow-green-500/25',
      iconBg: 'bg-green-50 ring-1 ring-green-100'
    }
  };

  const currentStyle = typeStyles[type];

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto ${languageClasses}`}>
      {/* Enhanced Backdrop with blur */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-all duration-200 animate-in fade-in"
        onClick={onClose}
      />
      
      {/* Dialog with enhanced animations */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div 
          className="
            relative bg-white rounded-2xl shadow-2xl max-w-md w-full 
            p-6 lg:p-8 transform transition-all duration-200
            animate-in slide-in-from-bottom-4 zoom-in-95
            ring-1 ring-gray-100
          "
          onClick={(e) => e.stopPropagation()}
        >
          {/* Enhanced Icon with ring */}
          <div className={`
            mx-auto flex items-center justify-center 
            h-14 w-14 lg:h-16 lg:w-16 rounded-2xl 
            ${currentStyle.iconBg} mb-6 lg:mb-8
            transition-transform duration-200 hover:scale-105
          `}>
            <span className="text-2xl lg:text-3xl">{currentStyle.icon}</span>
          </div>

          {/* Enhanced Content */}
          <div className={`text-center ${conditionalClass.textAlign}`}>
            {/* Title with better typography */}
            <h3 className="heading-5 text-gray-900 mb-3 lg:mb-4 font-hebrew">
              {title}
            </h3>

            {/* Message with improved spacing */}
            <div className="body-text text-gray-600 space-y-3 mb-8 lg:mb-10">
              {typeof message === 'string' ? (
                <p className="font-hebrew leading-relaxed">{message}</p>
              ) : (
                message
              )}
            </div>
          </div>

          {/* Enhanced Actions with better spacing */}
          <div className={`
            flex gap-3 lg:gap-4 
            ${isRTL ? 'flex-row-reverse' : 'flex-row'}
          `}>
            {/* Enhanced Cancel Button */}
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="
                flex-1 px-4 lg:px-6 py-3 lg:py-4 
                text-sm lg:text-base font-medium text-gray-700 
                bg-white border border-gray-200 rounded-xl 
                shadow-sm hover:bg-gray-50 hover:border-gray-300
                hover:shadow-md hover:-translate-y-0.5
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300
                disabled:opacity-50 disabled:cursor-not-allowed 
                disabled:transform-none disabled:shadow-sm
                transition-all duration-200 font-hebrew
              "
            >
              {cancelText || t('common.cancel')}
            </button>

            {/* Enhanced Confirm Button */}
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`
                flex-1 px-4 lg:px-6 py-3 lg:py-4 
                text-sm lg:text-base font-medium text-white font-hebrew
                border border-transparent rounded-xl shadow-sm 
                focus:outline-none focus:ring-2 focus:ring-offset-2 
                disabled:opacity-50 disabled:cursor-not-allowed 
                disabled:transform-none disabled:shadow-sm
                flex items-center justify-center
                transition-all duration-200 hover:-translate-y-0.5
                ${currentStyle.confirmButton}
              `}
            >
              {isLoading && (
                <svg className={`animate-spin h-4 w-4 lg:h-5 lg:w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {confirmText || t('common.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;