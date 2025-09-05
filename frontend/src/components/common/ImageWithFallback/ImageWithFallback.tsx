import React, { useState, useCallback } from 'react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  fallbackSrc = '/images/placeholder.jpg',
  className = '',
  loading = 'lazy',
  onLoad,
  onError
}) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    if (!hasError && imgSrc !== fallbackSrc) {
      setHasError(true);
      setImgSrc(fallbackSrc);
    }
    onError?.();
  }, [hasError, imgSrc, fallbackSrc, onError]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  // Progressive image loading with WebP support
  const getOptimizedSrc = (originalSrc: string) => {
    if (originalSrc.includes('cdn.trailguide.app')) {
      return `${originalSrc}?format=webp&quality=80&width=800`;
    }
    return originalSrc;
  };

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
          <div className="text-gray-400 text-sm">טוען תמונה...</div>
        </div>
      )}
      <picture>
        <source 
          srcSet={`${getOptimizedSrc(imgSrc)} 1x, ${getOptimizedSrc(imgSrc)}?width=1600 2x`}
          type="image/webp"
        />
        <img
          src={imgSrc}
          alt={alt}
          className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}`}
          loading={loading}
          onError={handleError}
          onLoad={handleLoad}
        />
      </picture>
    </div>
  );
};