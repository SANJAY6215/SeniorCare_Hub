import { useUserStore } from '@/stores/userStore';
import { Colors, ColorScheme } from '@/constants/Colors';

export function useTheme(): { colors: ColorScheme; isDark: boolean } {
  const isDark = useUserStore((s) => s.profile?.darkMode ?? false);
  return {
    colors: isDark ? Colors.dark : Colors.light,
    isDark,
  };
}

export function useTextScale(): number {
  const textSize = useUserStore((s) => s.profile?.textSize);
  switch (textSize) {
    case 'medium': return 1.0;
    case 'large': return 1.15;
    case 'extra-large': return 1.3;
    default: return 1.15;
  }
}
