import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../hooks/useLanguageDirection';

const ImageUpload = ({ 
  onImageSelect, 
  onImageRemove, 
  error = null, 
  disabled = false,
  className = '',
  value = null 
}) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguageDirection();
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(value);

  // File validation constants
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  const validateFile = (file) => {
    if (!file) return null;

    if (!ALLOWED_TYPES.includes(file.type)) {
      return t('createGuide.form.validation.invalidFileType');
    }

    if (file.size > MAX_FILE_SIZE) {
      return t('createGuide.form.validation.fileTooLarge');
    }

    return null;
  };

  const handleFileSelect = useCallback((file) => {
    if (!file || disabled) return;

    const validationError = validateFile(file);
    if (validationError) {
      if (onImageSelect) {
        onImageSelect(null, validationError);
      }
      return;
    }

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Call parent callback
    if (onImageSelect) {
      onImageSelect(file, null);
    }
  }, [disabled, onImageSelect, t]);

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [disabled, handleFileSelect]);

  const handleRemoveImage = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    
    if (onImageRemove) {
      onImageRemove();
    }
  };

  const handleClick = () => {
    if (!disabled) {
      document.getElementById('coverImageInput').click();
    }
  };

  // Clean up preview URL on unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className={`w-full ${className}`}>
      {/* Upload Area */}
      {!previewUrl ? (
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            transition-all duration-200 ease-in-out
            ${isDragOver 
              ? 'border-blue-500 bg-blue-50' 
              : error 
                ? 'border-red-300 bg-red-50' 
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            id="coverImageInput"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled}
          />
          
          <div className="space-y-4">
            {/* Upload Icon */}
            <div className="flex justify-center">
              <svg
                className={`w-12 h-12 ${error ? 'text-red-400' : 'text-gray-400'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            
            {/* Upload Text */}
            <div className="space-y-2">
              <p className={`text-lg font-medium ${error ? 'text-red-700' : 'text-gray-700'}`}>
                {t('createGuide.basicInfo.dragDropImage')}
              </p>
              
              <div className="space-y-1 text-sm text-gray-500">
                <p>{t('createGuide.basicInfo.imageFormats')}</p>
                <p>{t('createGuide.basicInfo.maxFileSize')}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Preview Area */
        <div className="relative">
          <div className="relative border-2 border-gray-200 rounded-lg overflow-hidden">
            <img
              src={previewUrl}
              alt={t('createGuide.basicInfo.imagePreview')}
              className="w-full h-48 object-cover"
            />
            
            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <div className={`flex space-x-3 ${isRTL ? 'space-x-reverse' : ''}`}>
                <button
                  type="button"
                  onClick={handleClick}
                  disabled={disabled}
                  className="px-3 py-1.5 bg-white bg-opacity-90 text-gray-700 rounded text-sm font-medium hover:bg-opacity-100 transition-colors duration-200 disabled:opacity-50"
                >
                  {t('createGuide.basicInfo.changeImage')}
                </button>
                
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={disabled}
                  className="px-3 py-1.5 bg-red-600 bg-opacity-90 text-white rounded text-sm font-medium hover:bg-opacity-100 transition-colors duration-200 disabled:opacity-50"
                >
                  {t('createGuide.basicInfo.removeImage')}
                </button>
              </div>
            </div>
          </div>
          
          {/* Hidden file input for change functionality */}
          <input
            id="coverImageInput"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled}
          />
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className={`mt-2 text-sm text-red-600 ${isRTL ? 'text-right' : 'text-left'}`}>
          {error}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;