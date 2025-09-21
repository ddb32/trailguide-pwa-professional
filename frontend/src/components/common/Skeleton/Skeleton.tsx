import React from 'react';
// import { ANIMATION_CONFIG } from '../../../config/animations'; // Unused import

// Base Skeleton Props Interface
interface BaseSkeletonProps {
  /** Whether to show the shimmer animation */
  animate?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Animation speed variant */
  speed?: 'slow' | 'normal' | 'fast';
  /** Whether to respect reduced motion preferences */
  respectMotion?: boolean;
}

// Individual Skeleton Component Props
interface SkeletonProps extends BaseSkeletonProps {
  /** Width of the skeleton element */
  width?: string | number;
  /** Height of the skeleton element */
  height?: string | number;
  /** Border radius variant */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Number of lines for text skeleton */
  lines?: number;
}

// Skeleton Component Variants
interface SkeletonLineProps extends BaseSkeletonProps {
  /** Width percentage or specific width */
  width?: string | number;
  /** Height of the line */
  height?: 'xs' | 'sm' | 'md' | 'lg';
}

interface SkeletonCircleProps extends BaseSkeletonProps {
  /** Size of the circle */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

interface SkeletonCardProps extends BaseSkeletonProps {
  /** Whether to include an avatar/circle */
  avatar?: boolean;
  /** Avatar size when included */
  avatarSize?: 'sm' | 'md' | 'lg';
  /** Number of text lines */
  lines?: number;
  /** Whether to include action buttons */
  actions?: boolean;
  /** Card padding variant */
  padding?: 'sm' | 'md' | 'lg';
}

interface SkeletonTableProps extends BaseSkeletonProps {
  /** Number of rows to show */
  rows?: number;
  /** Number of columns to show */
  columns?: number;
  /** Whether to show table header */
  header?: boolean;
}

interface SkeletonListProps extends BaseSkeletonProps {
  /** Number of list items */
  items?: number;
  /** Whether items have avatars */
  avatar?: boolean;
  /** Number of lines per item */
  lines?: number;
}

// Base Skeleton Component
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  rounded = 'md',
  lines = 1,
  animate = true,
  speed = 'normal',
  respectMotion = true,
  className = '',
}) => {
  // Convert numeric dimensions to rem units
  const getSize = (size: string | number): string => {
    if (typeof size === 'number') return `${size / 16}rem`;
    return size;
  };

  // Rounded variants
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  };

  // Animation classes based on speed
  const animationClasses = {
    slow: 'animate-pulse-slow',
    normal: 'animate-pulse',
    fast: 'animate-pulse-fast',
  };

  // Base skeleton classes with hardware acceleration
  const baseClasses = [
    'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200',
    'bg-size-200 bg-pos-neg-100',
    roundedClasses[rounded],
    animate && !respectMotion ? animationClasses[speed] : '',
    respectMotion ? 'motion-safe:' + animationClasses[speed] : '',
    'will-change-transform',
    'transform-gpu',
    className
  ].filter(Boolean).join(' ');

  // Shimmer animation classes
  const shimmerClasses = [
    'relative overflow-hidden',
    'before:absolute before:inset-0',
    'before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
    animate && !respectMotion ? 'before:animate-shimmer' : '',
    respectMotion ? 'motion-safe:before:animate-shimmer' : '',
  ].filter(Boolean).join(' ');

  if (lines === 1) {
    return (
      <div
        className={`${baseClasses} ${animate ? shimmerClasses : ''}`}
        style={{
          width: getSize(width),
          height: getSize(height)
        }}
        aria-hidden="true"
        data-testid="skeleton"
      />
    );
  }

  // Multi-line skeleton
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className={`${baseClasses} ${animate ? shimmerClasses : ''}`}
          style={{
            width: index === lines - 1 ? '75%' : '100%',
            height: getSize(height)
          }}
        />
      ))}
    </div>
  );
};

// Skeleton Line Component
export const SkeletonLine: React.FC<SkeletonLineProps> = ({
  width = '100%',
  height = 'md',
  animate = true,
  speed = 'normal',
  respectMotion = true,
  className = '',
}) => {
  const heightClasses = {
    xs: 'h-2',
    sm: 'h-3',
    md: 'h-4',
    lg: 'h-6',
  };

  return (
    <Skeleton
      width={width}
      height={heightClasses[height]}
      animate={animate}
      speed={speed}
      respectMotion={respectMotion}
      className={className}
    />
  );
};

// Skeleton Circle Component
export const SkeletonCircle: React.FC<SkeletonCircleProps> = ({
  size = 'md',
  animate = true,
  className = '',
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    '2xl': 'w-20 h-20',
    '3xl': 'w-24 h-24',
    '4xl': 'w-32 h-32',
  };

  return (
    <div
      className={`${sizeClasses[size]} bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full ${
        animate ? 'animate-pulse motion-safe:animate-pulse' : ''
      } ${className}`}
      aria-hidden="true"
    />
  );
};

// Skeleton Card Component
export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  avatar = false,
  avatarSize = 'md',
  lines = 3,
  actions = false,
  padding = 'md',
  animate = true,
  speed = 'normal',
  respectMotion = true,
  className = '',
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 ${paddingClasses[padding]} ${className}`}
      aria-hidden="true"
    >
      {/* Header with optional avatar */}
      {avatar && (
        <div className="flex items-center space-x-4 mb-4">
          <SkeletonCircle
            size={avatarSize}
            animate={animate}
            speed={speed}
            respectMotion={respectMotion}
          />
          <div className="flex-1 space-y-2">
            <SkeletonLine
              width="40%"
              height="sm"
              animate={animate}
              speed={speed}
              respectMotion={respectMotion}
            />
            <SkeletonLine
              width="60%"
              height="xs"
              animate={animate}
              speed={speed}
              respectMotion={respectMotion}
            />
          </div>
        </div>
      )}

      {/* Content lines */}
      <div className="space-y-3">
        {Array.from({ length: lines }, (_, index) => (
          <SkeletonLine
            key={index}
            width={index === lines - 1 ? '75%' : '100%'}
            height="sm"
            animate={animate}
            speed={speed}
            respectMotion={respectMotion}
          />
        ))}
      </div>

      {/* Optional actions */}
      {actions && (
        <div className="flex justify-end space-x-3 mt-6">
          <Skeleton
            width="4rem"
            height="2rem"
            rounded="md"
            animate={animate}
            speed={speed}
            respectMotion={respectMotion}
          />
          <Skeleton
            width="5rem"
            height="2rem"
            rounded="md"
            animate={animate}
            speed={speed}
            respectMotion={respectMotion}
          />
        </div>
      )}
    </div>
  );
};

// Skeleton Table Component
export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
  header = true,
  animate = true,
  speed = 'normal',
  respectMotion = true,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* Table Header */}
      {header && (
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }, (_, index) => (
              <SkeletonLine
                key={index}
                width="80%"
                height="sm"
                animate={animate}
                speed={speed}
                respectMotion={respectMotion}
              />
            ))}
          </div>
        </div>
      )}

      {/* Table Body */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }, (_, colIndex) => (
                <SkeletonLine
                  key={colIndex}
                  width={colIndex === 0 ? '100%' : Math.random() > 0.5 ? '70%' : '90%'}
                  height="sm"
                  animate={animate}
                  speed={speed}
                  respectMotion={respectMotion}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Skeleton List Component
export const SkeletonList: React.FC<SkeletonListProps> = ({
  items = 5,
  avatar = false,
  lines = 2,
  animate = true,
  speed = 'normal',
  respectMotion = true,
  className = '',
}) => {
  return (
    <div className={`space-y-4 ${className}`} aria-hidden="true">
      {Array.from({ length: items }, (_, index) => (
        <div key={index} className="flex items-start space-x-4">
          {avatar && (
            <SkeletonCircle
              size="md"
              animate={animate}
              speed={speed}
              respectMotion={respectMotion}
            />
          )}
          <div className="flex-1 space-y-2">
            {Array.from({ length: lines }, (_, lineIndex) => (
              <SkeletonLine
                key={lineIndex}
                width={lineIndex === lines - 1 ? '60%' : '100%'}
                height="sm"
                animate={animate}
                speed={speed}
                respectMotion={respectMotion}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Skeleton Stats Grid (for dashboard)
interface SkeletonStatsProps extends BaseSkeletonProps {
  /** Number of stat cards */
  cards?: number;
  /** Grid columns */
  columns?: 2 | 3 | 4;
}

export const SkeletonStats: React.FC<SkeletonStatsProps> = ({
  cards = 4,
  columns = 4,
  animate = true,
  speed = 'normal',
  respectMotion = true,
  className = '',
}) => {
  const gridClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${gridClasses[columns]} gap-6 ${className}`}>
      {Array.from({ length: cards }, (_, index) => (
        <div
          key={index}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
          aria-hidden="true"
        >
          <div className="flex items-center justify-between mb-4">
            <SkeletonLine
              width="60%"
              height="sm"
              animate={animate}
              speed={speed}
              respectMotion={respectMotion}
            />
            <SkeletonCircle
              size="sm"
              animate={animate}
              speed={speed}
              respectMotion={respectMotion}
            />
          </div>
          <SkeletonLine
            width="40%"
            height="lg"
            animate={animate}
            speed={speed}
            respectMotion={respectMotion}
            className="mb-2"
          />
          <SkeletonLine
            width="50%"
            height="xs"
            animate={animate}
            speed={speed}
            respectMotion={respectMotion}
          />
        </div>
      ))}
    </div>
  );
};

// Export all skeleton components
export default {
  Skeleton,
  SkeletonLine,
  SkeletonCircle,
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
  SkeletonStats,
};