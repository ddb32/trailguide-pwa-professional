// Hybrid icon system: Professional SVG icons with emoji fallback
// This provides the best user experience while maintaining compatibility

// Emoji-based icon mapping (temporary fallback)
export const iconMap = {
  // Navigation & Core UI
  'menu': '☰',
  'close': '✕',
  'dashboard': '📊',
  'dashboard-solid': '📊',
  'create': '➕',
  'guides': '📋',
  'analytics': '📈',
  'settings': '⚙️',
  'logout': '🚪',
  'logo': '🧭',
  'home': '🏠',
  
  // Status & Actions
  'warning': '⚠️',
  'warning-solid': '⚠️',
  'info': 'ℹ️',
  'info-solid': 'ℹ️',
  'success': '✅',
  'success-solid': '✅',
  'error': '❌',
  'error-solid': '❌',
  'create-guide': '📝',
  'edit': '✏️',
  'users': '👥',
  'user': '👤',
  'views': '👀',
  'link': '🔗',
  'image': '🖼️',
  
  // Data & Trends
  'trending-up': '📈',
  'trending-down': '📉',
  'chart': '📊',
  'chart-solid': '📊',
  'chart-pie': '🥧',
  'adminDashboard': '🎛️',
  
  // Additional Feature Icons
  'document': '📄',
  'target': '🎯',
  'global': '🌍',
  'learn': '🎓',
  
  // UI Controls
  'chevron-down': '⬇️',
  'chevron-up': '⬆️',
  'chevron-left': '⬅️',
  'chevron-right': '➡️',
  'chevron-up-down': '↕️',
  'language': '🌐',
  'delete': '🗑️',
  
  // Auth & Security
  'eye': '👁️',
  'eye-slash': '🙈',
  'sign-in': '🔑',
  
  // Form & Input
  'minus': '➖',
  'plus': '➕',
  'search': '🔍',
  'external-link': '🔗',
  
  // Loading & Status Icons
  'loading': '⏳',
  'check': '✓',
  'arrow-left': '←',
  
  // New icons needed by Dashboard
  'feedback': '💬',
  'thumbs-up': '👍',
  'thumbs-down': '👎',
  'check-circle': '✅',
  'x-circle': '❌',
  'refresh': '🔄',
  'view': '👁️',
  'clock': '🕒',

  // Missing icons for admin components
  'alert-circle': '⚠️',
  'alert-triangle': '⚠️',
  'message-circle': '💬',
  'folder': '📁',
  'help-circle': '❓',
  'activity': '📊',
} as const;

// Type for valid icon names
export type IconName = keyof typeof iconMap;

// Icons that should flip in RTL layouts
export const rtlFlipIcons: Set<IconName> = new Set([
  'logout',
  'trending-up',
  'trending-down',
  'chevron-left',
  'chevron-right',
  'arrow-left', // New directional icon that should flip in RTL
]);

// Icon size mapping to Tailwind classes
export const iconSizeMap = {
  'xs': 'w-3 h-3', // 12px
  'sm': 'w-4 h-4', // 16px
  'md': 'w-5 h-5', // 20px
  'lg': 'w-6 h-6', // 24px
  'xl': 'w-8 h-8', // 32px
  '2xl': 'w-12 h-12', // 48px
  '3xl': 'w-16 h-16', // 64px
  '4xl': 'w-20 h-20', // 80px
} as const;

export type IconSize = keyof typeof iconSizeMap;

// Debug utility functions for development
export const debugIconMap = () => {
  console.log('🧪 IconMap Debug Info:', {
    totalIcons: Object.keys(iconMap).length,
    hasLoading: 'loading' in iconMap,
    hasCheck: 'check' in iconMap,
    hasArrowLeft: 'arrow-left' in iconMap,
    loadingValue: iconMap.loading,
    checkValue: iconMap.check,
    arrowLeftValue: iconMap['arrow-left'],
    sampleIcons: Object.keys(iconMap).slice(0, 10)
  });
  return iconMap;
};

// Verify specific icons exist
export const verifyIcons = (iconNames: string[]): { [key: string]: boolean } => {
  const results: { [key: string]: boolean } = {};
  iconNames.forEach(iconName => {
    results[iconName] = iconName in iconMap && !!iconMap[iconName as IconName];
  });
  return results;
};