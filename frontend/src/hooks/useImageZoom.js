import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { getZoomThresholds } from '../utils/device';

/**
 * Custom hook for image zoom and pan functionality
 * Supports both touch gestures (pinch-to-zoom, pan) and mouse interactions
 * Optimized for performance with throttled events and memoized calculations
 *
 * @param {Object} options - Configuration options
 * @param {number} options.minZoom - Minimum zoom scale (default: 1)
 * @param {number} options.maxZoom - Maximum zoom scale (default: 4)
 * @param {number} options.zoomSensitivity - Mouse wheel zoom sensitivity (default: auto-detected)
 */
export const useImageZoom = ({
  minZoom = 1,
  maxZoom = 4,
  zoomSensitivity
} = {}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Refs for tracking touch/mouse interactions
  const lastTouchDistance = useRef(0);
  const lastPanPoint = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  // Performance optimization: throttle refs
  const lastEventTime = useRef(0);
  const animationFrameRef = useRef(null);

  // Get device-optimized settings
  const deviceThresholds = useMemo(() => getZoomThresholds(), []);
  const effectiveZoomSensitivity = zoomSensitivity || deviceThresholds.zoomSensitivity;

  // Performance: throttle function for high-frequency events
  const throttle = useCallback((func, limit) => {
    return function (...args) {
      const now = Date.now();
      if (now - lastEventTime.current >= limit) {
        lastEventTime.current = now;
        func.apply(this, args);
      }
    };
  }, []);

  // Performance: request animation frame for smooth updates
  const scheduleUpdate = useCallback((updateFn) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(updateFn);
  }, []);

  // Reset zoom and position
  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
  }, []);

  // Constrain position to prevent image from going out of bounds
  const constrainPosition = useCallback((newX, newY, currentScale) => {
    if (!containerRef.current || !imageRef.current) {
      return { x: newX, y: newY };
    }

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const imageRect = imageRef.current.getBoundingClientRect();
    
    // Calculate maximum allowed offset
    const maxOffsetX = Math.max(0, (imageRect.width * currentScale - containerRect.width) / 2);
    const maxOffsetY = Math.max(0, (imageRect.height * currentScale - containerRect.height) / 2);
    
    return {
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, newX)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, newY))
    };
  }, []);

  // Handle zoom change with position adjustment
  const handleZoom = useCallback((newScale, centerPoint = { x: 0, y: 0 }) => {
    const clampedScale = Math.max(minZoom, Math.min(maxZoom, newScale));
    
    if (clampedScale === scale) return;

    // Calculate new position to keep zoom centered on the focal point
    const scaleRatio = clampedScale / scale;
    const newX = (position.x - centerPoint.x) * scaleRatio + centerPoint.x;
    const newY = (position.y - centerPoint.y) * scaleRatio + centerPoint.y;
    
    const constrainedPosition = constrainPosition(newX, newY, clampedScale);
    
    setScale(clampedScale);
    setPosition(constrainedPosition);
  }, [scale, position, minZoom, maxZoom, constrainPosition]);

  // Optimized touch event handlers with device-specific thresholds
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      // Pinch gesture start - optimized distance calculation
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Only start pinch if distance is above minimum threshold
      if (distance > deviceThresholds.minPinchDistance) {
        lastTouchDistance.current = distance;
      }
    } else if (e.touches.length === 1) {
      // Pan gesture start - only if zoomed in
      if (scale > 1) {
        setIsDragging(true);
        lastPanPoint.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
      }
    }
  }, [scale, deviceThresholds.minPinchDistance]);

  // Optimized touch move handler with throttling
  const handleTouchMove = useCallback(
    throttle((e) => {
      e.preventDefault(); // Prevent scrolling

      if (e.touches.length === 2 && lastTouchDistance.current > 0) {
        // Optimized pinch gesture
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check minimum distance threshold to prevent jittery zooming
        if (Math.abs(distance - lastTouchDistance.current) > deviceThresholds.panThreshold) {
          const scaleChange = distance / lastTouchDistance.current;
          const newScale = scale * scaleChange;

          // Calculate center point of pinch
          const centerX = (touch1.clientX + touch2.clientX) * 0.5;
          const centerY = (touch1.clientY + touch2.clientY) * 0.5;

          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const centerPoint = {
              x: centerX - rect.left - rect.width * 0.5,
              y: centerY - rect.top - rect.height * 0.5
            };

            scheduleUpdate(() => {
              handleZoom(newScale, centerPoint);
            });
          }

          lastTouchDistance.current = distance;
        }
      } else if (e.touches.length === 1 && isDragging && scale > 1) {
        // Optimized pan gesture
        const touch = e.touches[0];
        const deltaX = touch.clientX - lastPanPoint.current.x;
        const deltaY = touch.clientY - lastPanPoint.current.y;

        // Only update if movement is above threshold
        if (Math.abs(deltaX) > deviceThresholds.panThreshold || Math.abs(deltaY) > deviceThresholds.panThreshold) {
          scheduleUpdate(() => {
            const newPosition = constrainPosition(
              position.x + deltaX,
              position.y + deltaY,
              scale
            );
            setPosition(newPosition);
          });

          lastPanPoint.current = { x: touch.clientX, y: touch.clientY };
        }
      }
    }, 16), // ~60fps throttling
    [scale, position, isDragging, handleZoom, constrainPosition, deviceThresholds, scheduleUpdate, throttle]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    lastTouchDistance.current = 0;
  }, []);

  // Mouse event handlers
  const handleMouseDown = useCallback((e) => {
    if (scale > 1) {
      setIsDragging(true);
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }
  }, [scale]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging && scale > 1) {
      const deltaX = e.clientX - lastPanPoint.current.x;
      const deltaY = e.clientY - lastPanPoint.current.y;
      
      const newPosition = constrainPosition(
        position.x + deltaX,
        position.y + deltaY,
        scale
      );
      
      setPosition(newPosition);
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
    }
  }, [isDragging, scale, position, constrainPosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Optimized wheel handler with throttling
  const handleWheel = useCallback(
    throttle((e) => {
      e.preventDefault();

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const centerPoint = {
        x: e.clientX - rect.left - rect.width * 0.5,
        y: e.clientY - rect.top - rect.height * 0.5
      };

      const zoomDelta = e.deltaY * -effectiveZoomSensitivity;
      const newScale = scale + zoomDelta;

      scheduleUpdate(() => {
        handleZoom(newScale, centerPoint);
      });
    }, 16), // ~60fps throttling
    [scale, effectiveZoomSensitivity, handleZoom, scheduleUpdate, throttle]
  );

  // Double-tap/click to toggle zoom
  const handleDoubleClick = useCallback((e) => {
    if (scale > 1) {
      resetZoom();
    } else {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const centerPoint = {
        x: e.clientX - rect.left - rect.width / 2,
        y: e.clientY - rect.top - rect.height / 2
      };
      
      handleZoom(2, centerPoint);
    }
  }, [scale, handleZoom, resetZoom]);

  // Cleanup effect for mouse events and animation frames
  useEffect(() => {
    const handleGlobalMouseMove = (e) => handleMouseMove(e);
    const handleGlobalMouseUp = () => handleMouseUp();

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove, { passive: false });
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Cleanup animation frames on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Optimized transform calculation with memoization
  const getTransform = useCallback(() => {
    const translateX = position.x / scale;
    const translateY = position.y / scale;
    return {
      transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
      transformOrigin: 'center center',
      transition: isDragging ? 'none' : 'transform 0.2s ease-out',
      willChange: isDragging ? 'transform' : 'auto'
    };
  }, [scale, position, isDragging]);

  // Memoized action handlers for better performance
  const zoomInAction = useCallback(() => {
    const increment = scale < 2 ? 0.5 : 0.25; // Smaller increments at higher zoom
    handleZoom(scale + increment);
  }, [scale, handleZoom]);

  const zoomOutAction = useCallback(() => {
    const decrement = scale > 2 ? 0.25 : 0.5; // Smaller decrements at higher zoom
    handleZoom(scale - decrement);
  }, [scale, handleZoom]);

  // Memoized event handler objects
  const touchHandlers = useMemo(() => ({
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  }), [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const mouseHandlers = useMemo(() => ({
    onMouseDown: handleMouseDown,
    onWheel: handleWheel,
    onDoubleClick: handleDoubleClick,
  }), [handleMouseDown, handleWheel, handleDoubleClick]);

  // Memoized return object to prevent unnecessary re-renders
  return useMemo(() => ({
    // State
    scale,
    position,
    isDragging,
    isZoomed: scale > 1,

    // Refs
    containerRef,
    imageRef,

    // Actions
    resetZoom,
    zoomIn: zoomInAction,
    zoomOut: zoomOutAction,

    // Event handlers
    touchHandlers,
    mouseHandlers,

    // Utilities
    getTransform,
  }), [
    scale,
    position,
    isDragging,
    resetZoom,
    zoomInAction,
    zoomOutAction,
    touchHandlers,
    mouseHandlers,
    getTransform
  ]);
};