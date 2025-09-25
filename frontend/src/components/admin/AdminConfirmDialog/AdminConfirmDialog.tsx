import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../../hooks/useLanguageDirection';
import { Icon } from '../../common/Icon';
import { Button } from '../../common/Button/Button';

export interface AdminConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  requiresTyping?: boolean;
  confirmationText?: string;
  details?: string[];
  isLoading?: boolean;
}

/**
 * Admin Confirmation Dialog Component
 *
 * Provides a secure confirmation dialog for destructive admin actions
 * with optional typing confirmation for high-risk operations.
 *
 * Features:
 * - Multi-step confirmation for destructive actions
 * - Optional typing confirmation for extra security
 * - Loading states during async operations
 * - Clear visual hierarchy with icons and colors
 * - RTL support for Hebrew interface
 * - Detailed information display
 */
const AdminConfirmDialog: React.FC<AdminConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  type = 'danger',
  requiresTyping = false,
  confirmationText = 'DELETE',
  details = [],
  isLoading = false
}) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguageDirection();
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isOpen) return null;

  const isTypingValid = !requiresTyping || typedConfirmation === confirmationText;
  const canConfirm = isTypingValid && !isLoading;

  const handleConfirm = async () => {
    if (!canConfirm) return;

    setIsConfirming(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirmation action failed:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleClose = () => {
    if (isLoading || isConfirming) return;
    setTypedConfirmation('');
    onClose();
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          iconColor: 'text-red-600',
          iconBg: 'bg-red-100',
          confirmButton: 'danger'
        };
      case 'warning':
        return {
          iconColor: 'text-yellow-600',
          iconBg: 'bg-yellow-100',
          confirmButton: 'warning'
        };
      default:
        return {
          iconColor: 'text-blue-600',
          iconBg: 'bg-blue-100',
          confirmButton: 'primary'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">

          {/* Header */}
          <div className="sm:flex sm:items-start">
            <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${styles.iconBg} sm:mx-0 sm:h-10 sm:w-10`}>
              <Icon
                name={type === 'danger' ? 'warning' : type === 'warning' ? 'warning' : 'info'}
                size="lg"
                className={styles.iconColor}
              />
            </div>

            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
              <h3 className="text-lg font-semibold leading-6 text-gray-900">
                {title}
              </h3>

              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  {message}
                </p>

                {/* Details list */}
                {details.length > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <p className="text-xs font-medium text-gray-700 mb-2">
                      {t('admin.confirmDialog.details')}:
                    </p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {details.map((detail, index) => (
                        <li key={index} className="flex items-center">
                          <Icon name="check" size="xs" className="text-gray-400 mr-2" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Typing confirmation */}
                {requiresTyping && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.confirmDialog.typeToConfirm', { text: confirmationText })}:
                    </label>
                    <input
                      type="text"
                      value={typedConfirmation}
                      onChange={(e) => setTypedConfirmation(e.target.value)}
                      placeholder={confirmationText}
                      className={`
                        w-full px-3 py-2 border rounded-md text-sm font-mono
                        ${isTypingValid ? 'border-green-300 bg-green-50' : 'border-gray-300'}
                        focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500
                        ${isRTL ? 'text-right' : 'text-left'}
                      `}
                      disabled={isLoading || isConfirming}
                    />
                    {typedConfirmation && !isTypingValid && (
                      <p className="text-xs text-red-600 mt-1">
                        {t('admin.confirmDialog.typingMismatch')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <Button
              onClick={handleConfirm}
              variant={styles.confirmButton as any}
              size="sm"
              disabled={!canConfirm}
              loading={isLoading || isConfirming}
              className="w-full justify-center sm:ml-3 sm:w-auto"
            >
              {confirmText || t('admin.confirmDialog.confirm')}
            </Button>

            <Button
              onClick={handleClose}
              variant="secondary"
              size="sm"
              disabled={isLoading || isConfirming}
              className="mt-3 w-full justify-center sm:mt-0 sm:w-auto"
            >
              {cancelText || t('admin.confirmDialog.cancel')}
            </Button>
          </div>

          {/* Loading indicator */}
          {(isLoading || isConfirming) && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
                <span className="text-sm text-gray-600">
                  {t('admin.confirmDialog.processing')}...
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminConfirmDialog;