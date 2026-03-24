import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';
import { Radius, Spacing } from '@/constants/Typography';

interface ThemedCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  gradient?: string[];
  delay?: number;
  highlightColor?: string;
}

export default function ThemedCard({
  children,
  style,
  gradient,
  delay = 0,
  highlightColor,
}: ThemedCardProps) {
  const { colors, isDark } = useTheme();

  const defaultGradient = isDark 
    ? ['#1e293b', '#0f172a'] 
    : ['#FFFFFF', '#F8FAFC'];

  return (
    <Animated.View 
      entering={FadeInDown.delay(delay).springify()}
      accessible={true}
      accessibilityRole="summary"
      style={[
        styles.container,
        { borderColor: highlightColor || colors.border },
        style
      ]}
    >
      <LinearGradient
        colors={gradient || defaultGradient}
        style={styles.gradient}
      >
        {children}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    marginBottom: Spacing.lg,
  },
  gradient: {
    padding: Spacing.xl,
  },
});
