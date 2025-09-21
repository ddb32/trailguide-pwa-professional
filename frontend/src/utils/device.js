/**
 * Device detection and mobile utilities
 */

// Detect mobile device
export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Detect touch support
export const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Detect iOS device
export const isIOSDevice = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

// Detect if device supports haptic feedback
export const supportsHapticFeedback = () => {
  return 'vibrate' in navigator || 'hapticFeedback' in navigator;
};

// Trigger haptic feedback (iOS and Android)
export const triggerHapticFeedback = (type = 'light') => {
  try {
    // iOS Safari haptic feedback
    if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
      // Use iOS haptic feedback if available
      if (navigator.vibrate) {
        const patterns = {
          light: [10],
          medium: [20],
          heavy: [30],
          success: [10, 50, 10],
          error: [100, 50, 100]
        };
        navigator.vibrate(patterns[type] || patterns.light);
      }
    }
    // Android and other devices
    else if (navigator.vibrate) {
      const patterns = {
        light: [25],
        medium: [50],
        heavy: [100],
        success: [25, 25, 25],
        error: [100, 50, 100]
      };
      navigator.vibrate(patterns[type] || patterns.light);
    }
  } catch (error) {
    // Haptic feedback not supported, silently fail
    console.debug('Haptic feedback not supported:', error);
  }
};

// Get optimal zoom gesture thresholds for device
export const getZoomThresholds = () => {
  const isMobile = isMobileDevice();
  const isTouch = isTouchDevice();

  return {
    minPinchDistance: isMobile ? 50 : 30,
    zoomSensitivity: isTouch ? 0.01 : 0.002,
    panThreshold: isMobile ? 10 : 5,
    doubleTapDelay: 300,
    longPressDelay: isMobile ? 500 : 300
  };
};

// Detect device pixel ratio for high-DPI displays
export const getDevicePixelRatio = () => {
  return window.devicePixelRatio || 1;
};

// Get viewport dimensions
export const getViewportDimensions = () => {
  return {
    width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
    height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
  };
};

// Check if device is in landscape mode
export const isLandscapeMode = () => {
  const viewport = getViewportDimensions();
  return viewport.width > viewport.height;
};

// Prevent zoom on iOS Safari (for form inputs)
export const preventIOSZoom = () => {
  if (isIOSDevice()) {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content',
        'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
      );
    }
  }
};

// Restore zoom on iOS Safari
export const restoreIOSZoom = () => {
  if (isIOSDevice()) {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content',
        'width=device-width, initial-scale=1, user-scalable=yes'
      );
    }
  }
};