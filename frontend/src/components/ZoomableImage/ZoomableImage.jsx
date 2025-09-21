import React, { useState, useRef, useEffect, useCallback } from 'react';
import ImageZoomModal from './ImageZoomModal';
import { isMobileDevice, isTouchDevice, triggerHapticFeedback } from '../../utils/device';

const ZoomableImage = ({
  src,
  alt,
  className = '',
  containerClassName = '',
  onLoad,
  onError,
  style = {},
  aspectRatio,
  showZoomHint = true,
  enableMobileOptimization = true,
  enableHapticFeedback = true,
  zoomHintDelay = 2000,
  ...imageProps
}) => {
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalAspectRatio, setNaturalAspectRatio] = useState(null);
  const [showAnimatedHint, setShowAnimatedHint] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const imageRef = useRef(null);
  const hintTimeoutRef = useRef(null);

  // Device detection
  const isMobile = isMobileDevice();
  const isTouch = isTouchDevice();

  const handleImageLoad = useCallback((e) => {
    setImageLoaded(true);

    // Calculate natural aspect ratio for mobile optimization
    const img = e.target;
    const ratio = img.naturalWidth / img.naturalHeight;
    setNaturalAspectRatio(ratio);

    // Show animated hint after delay for first-time users
    if (showZoomHint && !hasInteracted && zoomHintDelay > 0) {
      hintTimeoutRef.current = setTimeout(() => {
        setShowAnimatedHint(true);
        // Auto-hide hint after animation
        setTimeout(() => setShowAnimatedHint(false), 3000);
      }, zoomHintDelay);
    }

    // Call parent onLoad handler if provided
    if (onLoad) {
      onLoad(e);
    }
  }, [onLoad, showZoomHint, hasInteracted, zoomHintDelay]);

  const handleImageError = useCallback((e) => {
    setImageLoaded(false);

    // Call parent onError handler if provided
    if (onError) {
      onError(e);
    }
  }, [onError]);

  const handleImageClick = useCallback(() => {
    if (imageLoaded && src) {
      setHasInteracted(true);
      setShowAnimatedHint(false);

      // Trigger haptic feedback on mobile
      if (enableHapticFeedback && (isMobile || isTouch)) {
        triggerHapticFeedback('light');
      }

      setIsZoomModalOpen(true);
    }
  }, [imageLoaded, src, enableHapticFeedback, isMobile, isTouch]);

  const handleImageHover = useCallback(() => {
    if (!hasInteracted) {
      setHasInteracted(true);
      setShowAnimatedHint(false);
    }
  }, [hasInteracted]);

  const handleCloseZoom = useCallback(() => {
    setIsZoomModalOpen(false);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current);
      }
    };
  }, []);

  // Enhanced container styles with accessibility
  const getContainerStyles = () => {
    return {
      position: 'relative',
      width: '100%',
      height: '100%',
      cursor: imageLoaded ? 'pointer' : 'default',
      borderRadius: 'inherit',
      overflow: 'hidden',
      ...style
    };
  };

  // Dynamic image styles for mobile vs desktop
  const getImageStyles = () => {
    return {
      width: '100%',
      height: '100%',
      transition: 'transform 0.2s ease-out'
    };
  };

  return (
    <>
      <div
        className={`group relative ${containerClassName}`}
        style={getContainerStyles()}
        onMouseEnter={handleImageHover}
        role="button"
        tabIndex={imageLoaded ? 0 : -1}
        aria-label={imageLoaded ? `Tap to zoom ${alt}` : alt}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleImageClick();
          }
        }}
      >
        {/* Enhanced Zoom Hint Overlay */}
        {showZoomHint && imageLoaded && !hasInteracted && (
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 z-10 pointer-events-none">
            <div className="bg-black bg-opacity-80 text-white px-4 py-3 rounded-xl text-sm font-medium flex items-center space-x-2 shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
              <span>{isTouch ? 'Tap to zoom' : 'Click to zoom'}</span>
            </div>
          </div>
        )}

        {/* Animated Zoom Hint (First-time users) */}
        {showAnimatedHint && imageLoaded && (
          <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center z-20 pointer-events-none animate-pulse">
            <div className="bg-white text-gray-800 px-6 py-4 rounded-2xl text-base font-semibold flex items-center space-x-3 shadow-2xl transform animate-bounce">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
              <span>{isTouch ? '👆 Tap to zoom in' : '🖱️ Click to zoom in'}</span>
            </div>
          </div>
        )}

        {/* Main Image */}
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          className={`${className} ${enableMobileOptimization && !className.includes('object-') ? 'object-contain lg:object-cover' : ''} ${!className.includes('transition') ? 'transition-all duration-300' : ''} ${!className.includes('group-hover:scale') ? 'group-hover:scale-105' : ''} ${imageLoaded ? 'opacity-100' : 'opacity-0'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
          style={getImageStyles()}
          onLoad={handleImageLoad}
          onError={handleImageError}
          onClick={handleImageClick}
          draggable={false}
          loading="lazy"
          {...imageProps}
        />

        {/* Enhanced Mobile Touch Indicator */}
        {imageLoaded && isTouch && (
          <div className="absolute top-3 right-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white p-2 rounded-full opacity-80 group-hover:opacity-100 transition-all duration-300 shadow-lg md:hidden">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </div>
        )}

        {/* Desktop Zoom Indicator */}
        {imageLoaded && !isTouch && (
          <div className="absolute bottom-3 right-3 bg-black bg-opacity-60 text-white px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hidden md:flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
            <span className="text-sm">Click to zoom</span>
          </div>
        )}

        {/* Loading indicator */}
        {!imageLoaded && src && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          </div>
        )}
      </div>

      {/* Enhanced Zoom Modal */}
      <ImageZoomModal
        isOpen={isZoomModalOpen}
        onClose={handleCloseZoom}
        imageSrc={src}
        imageAlt={alt}
        enableHapticFeedback={enableHapticFeedback}
        isMobile={isMobile}
        isTouch={isTouch}
      />
    </>
  );
};

export default ZoomableImage;