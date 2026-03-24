import '@testing-library/jest-native/extend-expect';
import { vi } from 'vitest';

// Mock Expo Router
vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

// Mock Expo Notifications
vi.mock('expo-notifications', () => ({
  setNotificationHandler: vi.fn(),
  scheduleNotificationAsync: vi.fn().mockResolvedValue('test-id'),
  cancelAllScheduledNotificationsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  getPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
}));

// Mock Haptics
vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(),
  impactAsync: vi.fn(),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Mock React Native
vi.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: vi.fn(obj => obj.ios || obj.default),
  },
  StyleSheet: {
    create: vi.fn(obj => obj),
  },
  Animated: {
    Value: vi.fn(() => ({
      interpolate: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
    timing: vi.fn(() => ({ start: vi.fn() })),
    spring: vi.fn(() => ({ start: vi.fn() })),
  },
}));

// Mock Reanimated
vi.mock('react-native-reanimated', () => ({
  default: {
    Value: vi.fn(),
    event: vi.fn(),
  },
  useSharedValue: vi.fn(() => ({ value: 0 })),
  useAnimatedStyle: vi.fn(() => ({})),
  withSpring: vi.fn(),
  withTiming: vi.fn(),
  FadeInDown: {
    delay: vi.fn().mockReturnThis(),
    springify: vi.fn().mockReturnThis(),
    duration: vi.fn().mockReturnThis(),
  },
  Layout: {
    springify: vi.fn().mockReturnThis(),
  },
}));
