export const Typography = {
  // Sizes (in pixels — React Native uses sp/dp)
  xxs: 12,
  xs: 14,
  sm: 16,   // minimum for elderly
  md: 18,
  lg: 20,
  xl: 24,
  xxl: 28,
  xxxl: 32,
  display: 40,
  giant: 48,

  // Weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,

  // Line heights
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

// Minimum touch target (WCAG AAA)
export const TOUCH_TARGET = 48;
