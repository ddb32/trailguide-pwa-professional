import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../Button/Button';
import { Icon } from '../Icon/Icon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  closeOnOverlay?: boolean;
  showCloseButton?: boolean;
  showHeader?: boolean;
  children: React.ReactNode;
  className?: string;
  backdropClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  closeOnOverlay = true,
  showCloseButton = true,
  showHeader = true,
  children,
  className = '',
  backdropClassName = ''
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  // Handle escape key and focus management
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Focus management - focus the modal when it opens
      setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.focus();
        }
      }, 100);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    xs: 'max-w-sm',
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    full: 'max-w-full h-screen'
  };

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && closeOnOverlay) {
      onClose();
    }
  };

  const modalContent = (
    <div 
      className={`
        fixed inset-0 z-50 flex items-center justify-center p-4 
        bg-black/60 backdrop-blur-md
        animate-in fade-in duration-200
        ${backdropClassName}
      `}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div 
        ref={modalRef}
        tabIndex={-1}
        className={`
          relative w-full ${sizeClasses[size]} 
          bg-white rounded-2xl shadow-2xl
          animate-in slide-in-from-bottom-4 zoom-in-95 duration-200
          focus:outline-none focus:ring-2 focus:ring-primary-500/20
          ${size === 'full' ? 'mx-0 my-0 rounded-none' : 'mx-4'}
          ${className}
        `}
        dir="rtl"
      >
        {/* Header */}
        {showHeader && (title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 lg:p-8 border-b border-gray-100 bg-gray-50/50">
            <h2 id="modal-title" className="heading-4 text-gray-900 font-hebrew">
              {title}
            </h2>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                onClick={onClose}
                ariaLabel="Close modal"
                icon={<Icon name="close" size="md" />}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
              />
            )}
          </div>
        )}

        {/* Content */}
        <div className={`
          ${showHeader && (title || showCloseButton) ? 'p-6 lg:p-8' : 'p-6 lg:p-8 pt-8'}
          ${size === 'full' ? 'max-h-[calc(100vh-120px)]' : 'max-h-[calc(100vh-200px)]'} 
          overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100
        `}>
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};