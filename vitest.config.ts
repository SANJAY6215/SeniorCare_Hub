import { defineConfig } from 'vitest/config';
import reactNative from 'vitest-react-native';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [reactNative(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./setupTests.ts'],
    include: ['**/*.test.{ts,tsx}'],
    deps: {
      inline: [
        'react-native',
        'expo',
        'expo-router',
        'expo-linear-gradient',
        'react-native-reanimated',
        '@expo/vector-icons'
      ],
    },
  },
});
