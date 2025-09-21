import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
// import { useLanguageDirection } from '../../hooks/useLanguageDirection'; // Unused import
import { Button } from '../common/Button';
import { Icon } from '../common/Icon';

export interface ImageUploadProps {
  /** Callback when image is selected */
  onImageSelect: (file: File | null, error: string | null) => void;
  /** Callback when image is removed */
  onImageRemove: () => void;
  /** Current error message */
  error?: string | null;
  /** Disabled state */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Current value (File or URL string) */
  value?: File | string | null;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Allowed file types */
  allowedTypes?: string[];
  /** Show upload progress */
  showProgress?: boolean;
  /** Upload progress percentage */
  progress?: number;
  /** Multiple file selection */
  multiple?: boolean;
  /** Accept attribute for file input */
  accept?: string;
  /** Variant styling */
  variant?: 'default' | 'compact' | 'enhanced';
  /** ARIA label */
  ariaLabel?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
  onImageSelect, 
  onImageRemove, 
  error = null, 
  disabled = false,
  className = '',
  value = null,
  maxSize = 5 * 1024 * 1024, // 5MB
  allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  showProgress = false,
  progress = 0,
  multiple = false,
  accept = 'image/*',
  variant = 'default',
  ariaLabel
}) => {
  const { t } = useTranslation();
  // const { isRTL } = useLanguageDirection(); // Not used in this component
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  // Initialize preview URL based on value type
  useEffect(() => {
    if (value) {
      if (value instanceof File) {
        // New file selected - create blob URL
        const url = URL.createObjectURL(value);
        setPreviewUrl(url);
        setExistingImageUrl(null);
      } else if (typeof value === 'string') {
        // Existing image URL from server
        setExistingImageUrl(value);
        setPreviewUrl(null);
      }
    } else {
      setPreviewUrl(null);
      setExistingImageUrl(null);
    }
  }, [value]);

  // Clean up blob URLs
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const validateFile = useCallback((file: File): string | null => {
    if (!file) return null;

    if (!allowedTypes.includes(file.type)) {
      return t('createGuide.form.validation.invalidFileType');
    }

    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      return t('createGuide.form.validation.fileTooLarge', { size: maxSizeMB });
    }

    return null;
  }, [allowedTypes, maxSize, t]);

  const handleFileSelect = useCallback((file: File) => {
    if (disabled) return;

    const validationError = validateFile(file);
    onImageSelect(validationError ? null : file, validationError);
  }, [disabled, validateFile, onImageSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [disabled, handleFileSelect]);

  const handleRemoveImage = useCallback(() => {
    // Clean up blob URL if it exists
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    
    // Clear both preview and existing image
    setPreviewUrl(null);
    setExistingImageUrl(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    onImageRemove();
  }, [previewUrl, onImageRemove]);

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  // Determine what image to display
  const displayImageUrl = previewUrl || existingImageUrl;
  const hasImage = !!(previewUrl || existingImageUrl);

  // Variant styles - Professional design system
  const variantStyles = {
    default: {
      container: 'min-h-[300px]',
      dropzone: 'border-2 border-dashed rounded-2xl border-slate-300',
      preview: 'rounded-2xl'
    },
    compact: {
      container: 'min-h-[200px]',
      dropzone: 'border-2 border-dashed rounded-xl border-slate-300',
      preview: 'rounded-xl'
    },
    enhanced: {
      container: 'min-h-[400px]',
      dropzone: 'border-2 border-dashed rounded-3xl border-slate-300',
      preview: 'rounded-3xl'
    }
  };

  const styles = variantStyles[variant];

  return (
    <div className={`w-full ${className}`}>
      <div className={`
        relative ${styles.container} 
        transition-all duration-300 ease-out
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      `}>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          id="imageInput"
          type="file"
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
          multiple={multiple}
          className="sr-only"
          aria-label={ariaLabel || t('createGuide.basicInfo.coverImage')}
        />

        {!hasImage ? (
          /* Upload Area */
          <div
            className={`
              ${styles.dropzone}
              transition-all duration-500 ease-out cursor-pointer backdrop-blur-sm
              ${isDragOver 
                ? 'border-primary-400 bg-primary-50/80 shadow-primary-200/30 shadow-2xl scale-[1.02]' 
                : error 
                ? 'border-red-400 bg-red-50/60 shadow-red-200/30 shadow-lg hover:border-red-500 hover:bg-red-50/80'
                : 'bg-white/40 hover:border-primary-400 hover:bg-primary-50/60 hover:shadow-primary-200/20 hover:shadow-xl'
              }
              ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.01]'}
              group relative overflow-hidden
            `}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleClick}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label={ariaLabel || t('createGuide.basicInfo.coverImage')}
            onKeyDown={(e) => {
              if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                handleClick();
              }
            }}
          >
            {/* Subtle background */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 opacity-60" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.1)_0%,transparent_70%)]" />
            </div>

            {/* Upload content - Perfect centering */}
            <div className="relative h-full min-h-[300px] flex flex-col items-center justify-center px-6 py-8">
              
              {/* Custom SVG Upload Icon */}
              <div className={`
                relative mb-6 transition-all duration-500 ease-out transform
                ${isDragOver 
                  ? 'scale-110' 
                  : error
                  ? 'scale-95'
                  : 'group-hover:scale-105'
                }
              `}>
                <div className={`
                  w-20 h-20 rounded-full flex items-center justify-center relative
                  backdrop-blur-sm border transition-all duration-300
                  ${isDragOver 
                    ? 'bg-primary-100/80 border-primary-200 shadow-primary-200/50 shadow-lg' 
                    : error
                    ? 'bg-red-50/80 border-red-200 shadow-red-200/30 shadow-md'
                    : 'bg-white/60 border-slate-200 shadow-slate-200/40 shadow-md group-hover:bg-primary-50/80 group-hover:border-primary-200 group-hover:shadow-primary-200/50'
                  }
                `}>
                  {/* Custom Cloud Upload SVG */}
                  <svg 
                    className={`w-8 h-8 transition-colors duration-300 ${
                      isDragOver 
                        ? 'text-primary-600' 
                        : error
                        ? 'text-red-500'
                        : 'text-slate-500 group-hover:text-primary-600'
                    }`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" 
                    />
                  </svg>
                  
                  {/* Pulse ring on hover/drag */}
                  <div className={`
                    absolute inset-0 rounded-full border-2 transition-all duration-300
                    ${isDragOver 
                      ? 'border-primary-300 scale-125 opacity-30' 
                      : 'border-transparent group-hover:border-primary-200 group-hover:scale-110 group-hover:opacity-50'
                    }
                  `} />
                </div>
              </div>

              {/* Upload text with perfect typography */}
              <div className="text-center space-y-4 max-w-sm">
                <div>
                  <h3 className={`
                    text-lg font-semibold tracking-tight transition-colors duration-300
                    ${isDragOver 
                      ? 'text-primary-700' 
                      : error
                      ? 'text-red-600'
                      : 'text-slate-700 group-hover:text-primary-700'
                    }
                  `}>
                    {isDragOver 
                      ? t('createGuide.imageUpload.dropHere') || 'שחרר כאן' 
                      : t('createGuide.imageUpload.dragOrClick')
                    }
                  </h3>
                </div>
                
                <div className="space-y-2">
                  <p className={`
                    text-sm font-medium transition-colors duration-300
                    ${error ? 'text-red-500' : 'text-slate-600'}
                  `}>
                    {t('createGuide.imageUpload.supportedFormats')}
                  </p>
                  <p className={`
                    text-xs transition-colors duration-300
                    ${error ? 'text-red-400' : 'text-slate-500'}
                  `}>
                    {t('createGuide.imageUpload.maxSize', { size: (maxSize / (1024 * 1024)).toFixed(1) })}MB
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              {showProgress && progress > 0 && (
                <div className="w-full max-w-xs">
                  <div className="bg-secondary-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-primary-500 h-full transition-all duration-300 ease-out"
                      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                    />
                  </div>
                  <p className="text-xs text-secondary-600 mt-1 text-center">{Math.round(progress)}%</p>
                </div>
              )}
            </div>

            {/* Drag overlay effect */}
            <div className={`
              absolute inset-0 bg-primary-500/10 opacity-0 transition-opacity duration-300
              ${isDragOver ? 'opacity-100' : ''}
            `} />
          </div>
        ) : (
          /* Preview Area */
          <div className={`
            relative group ${styles.preview} overflow-hidden bg-secondary-50
            transition-all duration-300 hover:shadow-lg
            ${disabled ? 'opacity-60' : ''}
          `}>
            {/* Image */}
            <img
              src={displayImageUrl || ''}
              alt={t('createGuide.imageUpload.previewAlt')}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />

            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div className="flex space-x-3">
                {/* Replace button */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e?.stopPropagation();
                    handleClick();
                  }}
                  disabled={disabled}
                  icon={<Icon name="edit" size="sm" />}
                  className="bg-white/90 hover:bg-white text-secondary-900"
                >
                  {t('common.replace')}
                </Button>

                {/* Remove button */}
                <Button
                  variant="danger"
                  size="sm"
                  onClick={(e) => {
                    e?.stopPropagation();
                    handleRemoveImage();
                  }}
                  disabled={disabled}
                  icon={<Icon name="delete" size="sm" />}
                  className="bg-white/90 hover:bg-white text-error-700 hover:text-error-800"
                >
                  {t('common.remove')}
                </Button>
              </div>
            </div>

            {/* Progress overlay */}
            {showProgress && progress > 0 && progress < 100 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="mb-2">
                    <Icon name="image" size="lg" className="animate-pulse" />
                  </div>
                  <p className="text-sm font-medium">{t('common.uploading')} {Math.round(progress)}%</p>
                  <div className="w-32 bg-white/20 rounded-full h-1 mt-2">
                    <div 
                      className="bg-white h-full rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-error-600 animate-fade-in">
            <Icon name="error" size="sm" />
            <span>{error}</span>
          </div>
        )}

        {/* Success indicator */}
        {hasImage && !error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-success-600 animate-fade-in">
            <Icon name="success" size="sm" />
            <span>{t('createGuide.imageUpload.uploadSuccess')}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;