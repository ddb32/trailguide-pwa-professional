/**
 * Centralized Animation Configuration for TrailGuide PWA
 * 
 * This file provides a comprehensive animation system with:
 * - Standardized timing scales
 * - Consistent easing functions
 * - Hardware-accelerated transforms
 * - Accessibility-aware configurations
 */

// Animation Duration Scale (in milliseconds)
export const ANIMATION_DURATION = {
  instant: 0,
  fastest: 100,
  fast: 150,
  normal: 200,
  medium: 300,
  slow: 400,
  slowest: 500,
  lazy: 800,
} as const;

// Animation Timing Functions (Easing)
export const ANIMATION_EASING = {
  // Standard easing for most transitions
  default: 'cubic-bezier(0.4, 0, 0.2, 1)', // ease-out
  
  // Entrance animations (elements appearing)
  entrance: 'cubic-bezier(0, 0, 0.2, 1)', // ease-out
  
  // Exit animations (elements disappearing)  
  exit: 'cubic-bezier(0.4, 0, 1, 1)', // ease-in
  
  // Interactive elements (hover, focus, active)
  interactive: 'cubic-bezier(0.4, 0, 0.2, 1)', // ease-out
  
  // Elastic/bouncy animations
  elastic: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  
  // Spring-like natural motion
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  
  // Sharp, snappy transitions
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  
  // Smooth, flowing transitions
  smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
} as const;

// Animation Scales for consistent transforms
export const ANIMATION_SCALE = {
  subtle: 1.02,
  normal: 1.05,
  emphasis: 1.1,
  dramatic: 1.15,
} as const;

// Animation Translations (for slide effects)
export const ANIMATION_TRANSLATE = {
  micro: '2px',
  small: '4px',
  normal: '8px',
  large: '16px',
  xl: '24px',
} as const;

// Shadow Elevations for depth animation
export const ANIMATION_SHADOW = {
  none: '0 0 0 0 rgba(0, 0, 0, 0)',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  normal: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  md: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  lg: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  xl: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
} as const;

// Pre-defined animation presets
export const ANIMATION_PRESETS = {
  // Fade animations
  fadeIn: {
    duration: ANIMATION_DURATION.normal,
    easing: ANIMATION_EASING.entrance,
    keyframes: 'fadeIn',
  },
  fadeOut: {
    duration: ANIMATION_DURATION.fast,
    easing: ANIMATION_EASING.exit,
    keyframes: 'fadeOut',
  },
  
  // Slide animations
  slideInUp: {
    duration: ANIMATION_DURATION.medium,
    easing: ANIMATION_EASING.entrance,
    keyframes: 'slideInUp',
  },
  slideInDown: {
    duration: ANIMATION_DURATION.medium,
    easing: ANIMATION_EASING.entrance,
    keyframes: 'slideInDown',
  },
  slideInLeft: {
    duration: ANIMATION_DURATION.medium,
    easing: ANIMATION_EASING.entrance,
    keyframes: 'slideInLeft',
  },
  slideInRight: {
    duration: ANIMATION_DURATION.medium,
    easing: ANIMATION_EASING.entrance,
    keyframes: 'slideInRight',
  },
  
  // Scale animations
  scaleIn: {
    duration: ANIMATION_DURATION.fast,
    easing: ANIMATION_EASING.elastic,
    keyframes: 'scaleIn',
  },
  scaleOut: {
    duration: ANIMATION_DURATION.fast,
    easing: ANIMATION_EASING.exit,
    keyframes: 'scaleOut',
  },
  
  // Interactive animations
  buttonPress: {
    duration: ANIMATION_DURATION.fastest,
    easing: ANIMATION_EASING.sharp,
    scale: 0.95,
  },
  buttonHover: {
    duration: ANIMATION_DURATION.fast,
    easing: ANIMATION_EASING.interactive,
    scale: ANIMATION_SCALE.subtle,
    shadow: ANIMATION_SHADOW.md,
  },
  
  // Card animations
  cardHover: {
    duration: ANIMATION_DURATION.normal,
    easing: ANIMATION_EASING.smooth,
    scale: ANIMATION_SCALE.subtle,
    shadow: ANIMATION_SHADOW.lg,
    translateY: '-2px',
  },
  
  // Loading animations
  shimmer: {
    duration: 2000,
    easing: 'linear',
    keyframes: 'shimmer',
    iterationCount: 'infinite',
  },
  pulse: {
    duration: 2000,
    easing: ANIMATION_EASING.smooth,
    keyframes: 'pulse',
    iterationCount: 'infinite',
  },
  
  // Bounce animations
  bounceIn: {
    duration: ANIMATION_DURATION.medium,
    easing: ANIMATION_EASING.elastic,
    keyframes: 'bounceIn',
  },
  
  // Attention-seeking animations
  shake: {
    duration: ANIMATION_DURATION.medium,
    easing: ANIMATION_EASING.default,
    keyframes: 'shake',
  },
  
} as const;

// Stagger animation delays for list items
export const STAGGER_DELAY = {
  fast: 50,
  normal: 100,
  slow: 150,
} as const;

// Utility function to create staggered delays
export const createStaggerDelay = (index: number, baseDelay: number = STAGGER_DELAY.normal): number => {
  return index * baseDelay;
};

// Motion preferences utility
export const MOTION_REDUCE_CONFIG = {
  // Instant transitions for users who prefer reduced motion
  duration: ANIMATION_DURATION.instant,
  easing: 'linear',
} as const;

// Hardware acceleration helper
export const HARDWARE_ACCELERATION = {
  transform: 'translate3d(0, 0, 0)',
  backfaceVisibility: 'hidden' as const,
  perspective: 1000,
} as const;

// Performance optimization utilities
export const PERFORMANCE_HINTS = {
  // Will-change property values for different animation types
  willChange: {
    transform: 'transform',
    opacity: 'opacity',
    scroll: 'scroll-position',
    auto: 'auto',
  },
  
  // Contain property for layout optimization
  contain: {
    layout: 'layout',
    style: 'style',
    paint: 'paint',
    strict: 'strict',
  },
} as const;

// Animation class name generators
export const generateAnimationClass = (preset: keyof typeof ANIMATION_PRESETS): string => {
  const animation = ANIMATION_PRESETS[preset];
  return `animate-${preset}`;
};

export const generateHoverClass = (type: 'button' | 'card' | 'subtle' = 'subtle'): string => {
  const scales = {
    button: ANIMATION_SCALE.normal,
    card: ANIMATION_SCALE.subtle,
    subtle: ANIMATION_SCALE.subtle,
  };
  
  return `hover:scale-[${scales[type]}] transition-transform duration-${ANIMATION_DURATION.fast} ease-[${ANIMATION_EASING.interactive}]`;
};

// Responsive animation utilities
export const RESPONSIVE_ANIMATIONS = {
  // Disable animations on smaller screens for performance
  mobile: '@media (max-width: 768px)',
  // Enhanced animations for larger screens
  desktop: '@media (min-width: 1024px)',
  // Respect motion preferences
  motionSafe: '@media (prefers-reduced-motion: no-preference)',
  motionReduce: '@media (prefers-reduced-motion: reduce)',
} as const;

// Type definitions for TypeScript support
export type AnimationDuration = keyof typeof ANIMATION_DURATION;
export type AnimationEasing = keyof typeof ANIMATION_EASING;
export type AnimationScale = keyof typeof ANIMATION_SCALE;
export type AnimationPreset = keyof typeof ANIMATION_PRESETS;
export type AnimationShadow = keyof typeof ANIMATION_SHADOW;

// Export animation configuration object for external use
export const ANIMATION_CONFIG = {
  duration: ANIMATION_DURATION,
  easing: ANIMATION_EASING,
  scale: ANIMATION_SCALE,
  translate: ANIMATION_TRANSLATE,
  shadow: ANIMATION_SHADOW,
  presets: ANIMATION_PRESETS,
  stagger: STAGGER_DELAY,
  motionReduce: MOTION_REDUCE_CONFIG,
  performance: {
    hardware: HARDWARE_ACCELERATION,
    hints: PERFORMANCE_HINTS,
  },
  responsive: RESPONSIVE_ANIMATIONS,
} as const;