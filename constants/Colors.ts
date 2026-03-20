export const Colors = {
  light: {
    background: '#F8FAFC', // Softest blue-gray
    surface: '#FFFFFF',
    card: 'rgba(255, 255, 255, 0.85)', // Glass base
    glass: 'rgba(255, 255, 255, 0.65)',
    border: '#E2E8F0',
    text: '#1E293B', // Slate 800
    textSecondary: '#64748B', // Slate 500
    textMuted: '#94A3B8',
    primary: '#6366F1', // Indigo 500
    primaryLight: '#E0E7FF',
    success: '#10B981', // Emerald 500
    successLight: '#D1FAE5',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    danger: '#F43F5E', // Rose 500
    dangerLight: '#FFE4E6',
    tabBar: '#FFFFFF',
    tabBarActive: '#6366F1',
    tabBarInactive: '#94A3B8',
    // Gradients (Start, End)
    primaryGradient: ['#6366F1', '#4F46E5'],
    successGradient: ['#10B981', '#059669'],
    dangerGradient: ['#F43F5E', '#E11D48'],
    surfaceGradient: ['#FFFFFF', '#F8FAFC'],
  },
  dark: {
    background: '#0F172A', // Slate 900
    surface: '#1E293B', // Slate 800
    card: 'rgba(30, 41, 59, 0.85)', // Glass base
    glass: 'rgba(30, 41, 59, 0.65)',
    border: '#334155',
    text: '#F1F5F9', // Slate 100
    textSecondary: '#94A3B8', // Slate 400
    textMuted: '#64748B',
    primary: '#818CF8', // Indigo 400
    primaryLight: '#312E81',
    success: '#34D399', 
    successLight: '#064E3B',
    warning: '#FBBF24',
    warningLight: '#451A03',
    danger: '#FB7185',
    dangerLight: '#4C0519',
    tabBar: '#1E293B',
    tabBarActive: '#818CF8',
    tabBarInactive: '#64748B',
    // Gradients
    primaryGradient: ['#818CF8', '#6366F1'],
    successGradient: ['#34D399', '#10B981'],
    dangerGradient: ['#FB7185', '#F43F5E'],
    surfaceGradient: ['#1E293B', '#0F172A'],
  },
};

export type ColorScheme = typeof Colors.light;
