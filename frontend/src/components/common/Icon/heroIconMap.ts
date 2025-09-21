// Test file to verify Heroicons imports work with proper configuration
// This will help us determine if we can migrate from emoji fallback

// **FIXED SYNTAX**: Move exports outside try/catch blocks
let heroiconsTestResult = false;

try {
  // Try importing a single icon to test resolution
  const { Bars3Icon } = require('@heroicons/react/24/outline');
  
  if (Bars3Icon) {
    console.log('✅ Heroicons import test successful');
    heroiconsTestResult = true;
  } else {
    throw new Error('Icon component not found');
  }
  
} catch (error: unknown) {
  console.warn('❌ Heroicons import test failed:', (error as Error)?.message);
  heroiconsTestResult = false;
}

// **EXPORTS OUTSIDE TRY/CATCH**: Fix TypeScript syntax errors
export const heroiconsAvailable = heroiconsTestResult;

export const loadHeroIcon = async (iconName?: string, variant: 'outline' | 'solid' = 'outline') => {
  if (!heroiconsTestResult || !iconName) return null;
  
  try {
    const iconModule = await import(`@heroicons/react/24/${variant}`);
    return iconModule[iconName];
  } catch (error: unknown) {
    console.warn(`Failed to load Heroicon: ${iconName}`, (error as Error)?.message);
    return null;
  }
};