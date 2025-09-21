import React from 'react';
import { iconMap, rtlFlipIcons, iconSizeMap, IconName, IconSize } from './iconMap';
import { useLanguageDirection } from '../../../hooks/useLanguageDirection';

export interface IconProps {
  /** Name of the icon from the icon map */
  name: IconName;
  /** Size of the icon */
  size?: IconSize;
  /** Additional CSS classes */
  className?: string;
  /** Stroke width for outline icons (1-2) */
  strokeWidth?: number;
  /** ARIA label for accessibility */
  ariaLabel?: string;
  /** Whether to hide from screen readers */
  ariaHidden?: boolean;
  /** Force RTL flip regardless of context */
  forceFlipRTL?: boolean;
  /** Disable automatic RTL flipping */
  disableRTLFlip?: boolean;
  /** Custom color (overrides theme colors) */
  color?: string;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 'md',
  className = '',
  strokeWidth: _strokeWidth = 1.5,
  ariaLabel,
  ariaHidden = false,
  forceFlipRTL = false,
  disableRTLFlip = false,
  color,
}) => {
  const { isRTL } = useLanguageDirection();
  
  // Debug icon loading issues - only in development
  if (process.env.NODE_ENV === 'development' && (name === 'loading' || name === 'check' || name === 'arrow-left')) {
    console.log('🔍 Icon Debug:', {
      requestedIcon: name,
      iconMapKeys: Object.keys(iconMap).slice(0, 10), // First 10 keys for brevity
      iconMapType: typeof iconMap,
      iconExists: name in iconMap,
      iconValue: iconMap[name],
      totalIconsCount: Object.keys(iconMap).length
    });
  }
  
  // Get the emoji icon from the map
  const emojiIcon = iconMap[name];
  
  // Provide fallback for missing icons with graceful degradation  
  // Check for null, undefined, empty string, or whitespace
  if (!emojiIcon || typeof emojiIcon !== 'string' || emojiIcon.trim() === '') {
    // Enhanced debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(`❌ Icon "${name}" not found or invalid in iconMap:`, {
        requestedIcon: name,
        foundValue: emojiIcon,
        valueType: typeof emojiIcon,
        iconMapHasProperty: Object.prototype.hasOwnProperty.call(iconMap, name),
        availableIcons: Object.keys(iconMap).filter(key => key.includes(name.substring(0, 3))).slice(0, 5)
      });
    }
    
    // Return a fallback icon instead of null to prevent broken layouts
    const fallbackIcon = '❓'; // Question mark as universal "unknown" symbol
    
    const sizeClass = iconSizeMap[size];
    const combinedClassName = [
      sizeClass,
      className,
      'inline-block',
      'opacity-50' // Dim fallback icons to indicate they're not the intended icon
    ].filter(Boolean).join(' ');
    
    return (
      <span
        className={combinedClassName}
        aria-label={ariaLabel || `Unknown icon: ${name}`}
        aria-hidden={ariaHidden}
        title={process.env.NODE_ENV === 'development' ? `Missing icon: ${name}` : undefined}
        role={ariaLabel ? 'img' : undefined}
      >
        {fallbackIcon}
      </span>
    );
  }
  
  // Determine if icon should be flipped in RTL
  const shouldFlip = !disableRTLFlip && (forceFlipRTL || (isRTL && rtlFlipIcons.has(name)));
  
  // Combine size and custom classes
  const sizeClass = iconSizeMap[size];
  const flipClass = shouldFlip ? 'scale-x-[-1]' : '';
  
  const combinedClassName = [
    sizeClass,
    flipClass,
    className,
    'inline-block' // Ensure proper display
  ].filter(Boolean).join(' ');
  
  // Style object for custom colors (though emojis don't use custom colors)
  const style = color ? { color } : undefined;
  
  return (
    <span
      className={combinedClassName}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
      style={style}
      role={ariaLabel ? 'img' : undefined}
    >
      {emojiIcon}
    </span>
  );
};

// Export convenience components for common icon patterns
export const NavigationIcon: React.FC<Omit<IconProps, 'size'>> = (props) => (
  <Icon size="lg" {...props} />
);

export const ActionIcon: React.FC<Omit<IconProps, 'size'>> = (props) => (
  <Icon size="md" {...props} />
);

export const StatusIcon: React.FC<Omit<IconProps, 'size'>> = (props) => (
  <Icon size="xl" {...props} />
);

export const FeatureIcon: React.FC<Omit<IconProps, 'size'>> = (props) => (
  <Icon size="3xl" {...props} />
);

export default Icon;