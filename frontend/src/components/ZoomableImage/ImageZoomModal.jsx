import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useImageZoom } from '../../hooks/useImageZoom';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';
import { triggerHapticFeedback, getZoomThresholds } from '../../utils/device';

const ImageZoomModal = ({
  isOpen,
  onClose,
  imageSrc,
  imageAlt,
  className = '',
  enableHapticFeedback = true,
  isMobile = false,
  isTouch = false
}) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguageDirection();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const controlsTimeoutRef = useRef(null);
  const modalRef = useRef(null);

  // Get device-specific zoom thresholds
  const zoomThresholds = getZoomThresholds();
  
  const {
    scale,
    isZoomed,
    containerRef,
    imageRef,
    resetZoom,
    zoomIn,
    zoomOut,
    touchHandlers,
    mouseHandlers,
    getTransform
  } = useImageZoom({
    minZoom: 1,
    maxZoom: isMobile ? 4 : 5,
    zoomSensitivity: zoomThresholds.zoomSensitivity
  });

  // Enhanced zoom functions with haptic feedback
  const enhancedZoomIn = useCallback(() => {
    if (enableHapticFeedback && (isMobile || isTouch)) {
      triggerHapticFeedback('light');
    }
    zoomIn();
    setLastActivity(Date.now());
  }, [zoomIn, enableHapticFeedback, isMobile, isTouch]);

  const enhancedZoomOut = useCallback(() => {
    if (enableHapticFeedback && (isMobile || isTouch)) {
      triggerHapticFeedback('light');
    }
    zoomOut();
    setLastActivity(Date.now());
  }, [zoomOut, enableHapticFeedback, isMobile, isTouch]);

  const enhancedResetZoom = useCallback(() => {
    if (enableHapticFeedback && (isMobile || isTouch)) {
      triggerHapticFeedback('medium');
    }
    resetZoom();
    setLastActivity(Date.now());
  }, [resetZoom, enableHapticFeedback, isMobile, isTouch]);

  // Auto-hide controls on mobile after inactivity
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    if (isMobile && isOpen) {
      setShowControls(true);
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isMobile, isOpen]);

  // Track user activity to show/hide controls
  const handleUserActivity = useCallback(() => {
    setLastActivity(Date.now());
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  // Reset zoom when modal opens
  useEffect(() => {
    if (isOpen) {
      resetZoom();
      setImageLoaded(false);
      setImageError(false);
      setShowControls(true);
      setLastActivity(Date.now());
      resetControlsTimeout();
    }
  }, [isOpen, resetZoom, resetControlsTimeout]);

  // Enhanced keyboard handling with accessibility
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      handleUserActivity();

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case '+':
        case '=':
          e.preventDefault();
          enhancedZoomIn();
          break;
        case '-':
          e.preventDefault();
          enhancedZoomOut();
          break;
        case '0':
          e.preventDefault();
          enhancedResetZoom();
          break;
        case 'ArrowUp':
          e.preventDefault();
          enhancedZoomIn();
          break;
        case 'ArrowDown':
          e.preventDefault();
          enhancedZoomOut();
          break;
        case 'Home':
          e.preventDefault();
          enhancedResetZoom();
          break;
        case 'f':
        case 'F':
          // Toggle fullscreen-like behavior
          e.preventDefault();
          if (scale > 1) {
            enhancedResetZoom();
          } else {
            enhancedZoomIn();
          }
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll while modal is open
      document.body.style.overflow = 'hidden';

      // Focus trap - focus the modal container
      if (modalRef.current) {
        modalRef.current.focus();
      }
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';

      // Clean up controls timeout
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isOpen, onClose, enhancedZoomIn, enhancedZoomOut, enhancedResetZoom, scale, handleUserActivity]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget && !isZoomed) {
      onClose();
    }
  }, [onClose, isZoomed]);

  const handleCloseClick = useCallback(() => {
    if (enableHapticFeedback && (isMobile || isTouch)) {
      triggerHapticFeedback('light');
    }
    onClose();
  }, [onClose, enableHapticFeedback, isMobile, isTouch]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      ref={modalRef}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-95 ${className}`}
      onClick={handleBackdropClick}
      onTouchStart={handleUserActivity}
      onMouseMove={handleUserActivity}
      role="dialog"
      aria-modal="true"
      aria-label={`Zoomed view of ${imageAlt}`}
      tabIndex="-1"
    >
      {/* Loading State */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4"></div>
            <p className="text-lg">{t('common.loading')}</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-center max-w-md mx-4">
            <div className="text-6xl mb-4 opacity-70">⚠️</div>
            <h3 className="text-xl font-semibold mb-2">
              {t('errors.loadingImage')}
            </h3>
            <p className="text-gray-300 mb-6">
              {t('viewGuide.images.imageTemporarilyUnavailable')}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}

      {/* Image Container */}
      <div
        ref={containerRef}
        className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
        {...touchHandlers}
        {...mouseHandlers}
        style={{ touchAction: 'none' }} // Prevent default touch behaviors
      >
        <img
          ref={imageRef}
          src={imageSrc}
          alt={imageAlt}
          className="max-w-full max-h-full object-contain select-none"
          style={getTransform()}
          onLoad={handleImageLoad}
          onError={handleImageError}
          draggable={false}
        />
      </div>

      {/* Enhanced Controls UI with auto-hide on mobile */}
      {imageLoaded && (
        <div className={`transition-all duration-300 ${showControls || !isMobile ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {/* Enhanced Close Button */}
          <button
            onClick={handleCloseClick}
            className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} z-20 p-3 ${isMobile ? 'p-4' : 'p-3'} bg-black bg-opacity-60 text-white rounded-full hover:bg-opacity-80 active:bg-opacity-90 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-70 shadow-lg`}
            aria-label={t('common.close')}
          >
            <svg className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Enhanced Zoom Controls */}
          <div className={`absolute bottom-6 ${isRTL ? 'right-6' : 'left-6'} z-20 flex ${isMobile ? 'flex-row space-x-3' : 'flex-col space-y-3'}`}>
            {/* Zoom In */}
            <button
              onClick={enhancedZoomIn}
              disabled={scale >= (isMobile ? 4 : 5)}
              className={`${isMobile ? 'p-4' : 'p-3'} bg-black bg-opacity-60 text-white rounded-full hover:bg-opacity-80 active:bg-opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-70 shadow-lg ${isMobile ? 'touch-manipulation' : ''}`}
              aria-label={t('Zoom in')}
            >
              <svg className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>

            {/* Zoom Out */}
            <button
              onClick={enhancedZoomOut}
              disabled={scale <= 1}
              className={`${isMobile ? 'p-4' : 'p-3'} bg-black bg-opacity-60 text-white rounded-full hover:bg-opacity-80 active:bg-opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-70 shadow-lg ${isMobile ? 'touch-manipulation' : ''}`}
              aria-label={t('Zoom out')}
            >
              <svg className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
              </svg>
            </button>

            {/* Reset Zoom */}
            {isZoomed && (
              <button
                onClick={enhancedResetZoom}
                className={`${isMobile ? 'p-4' : 'p-3'} bg-black bg-opacity-60 text-white rounded-full hover:bg-opacity-80 active:bg-opacity-90 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-70 shadow-lg ${isMobile ? 'touch-manipulation' : ''}`}
                aria-label={t('Reset zoom')}
              >
                <svg className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
          </div>

          {/* Enhanced Zoom Level Indicator */}
          {isZoomed && (
            <div className={`absolute ${isMobile ? 'bottom-6 left-1/2 transform -translate-x-1/2' : `bottom-6 ${isRTL ? 'left-6' : 'right-6'}`} z-20 px-4 py-2 bg-black bg-opacity-70 text-white text-sm font-medium rounded-lg shadow-lg`}>
              {Math.round(scale * 100)}%
            </div>
          )}

          {/* Enhanced Help Text - Mobile */}
          <div className={`absolute top-6 ${isRTL ? 'right-6' : 'left-6'} z-20 text-white text-sm bg-black bg-opacity-70 px-4 py-3 rounded-lg md:hidden shadow-lg max-w-xs`}>
            <p className="font-medium">
              {isTouch ? '👆 Pinch to zoom • Drag to pan' : '🖱️ Scroll to zoom • Drag to pan'}
            </p>
            <p className="text-xs mt-1 opacity-80">Tap anywhere to show/hide controls</p>
          </div>

          {/* Enhanced Help Text - Desktop */}
          <div className={`absolute top-6 ${isRTL ? 'right-6' : 'left-6'} z-20 text-white text-sm bg-black bg-opacity-70 px-4 py-3 rounded-lg hidden md:block shadow-lg`}>
            <p className="font-medium">🖱️ Scroll to zoom • Drag to pan • Double-click to toggle</p>
            <p className="text-xs mt-1 opacity-80">Use +/- keys or arrows for zoom • Press F to toggle fit • ESC to close</p>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ImageZoomModal;