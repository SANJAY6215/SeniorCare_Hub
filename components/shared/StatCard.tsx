import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  FadeInDown,
  Layout 
} from 'react-native-reanimated';

import { useTheme, useTextScale } from '@/hooks/useTheme';
import { Radius } from '@/constants/Typography';

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  valueColor?: string;
  delay?: number;
  onPress?: () => void;
}

export default function StatCard({
  icon,
  iconColor,
  iconBg,
  label,
  value,
  valueColor,
  delay = 0,
  onPress,
}: StatCardProps) {
  const { colors, isDark } = useTheme();
  const scale = useTextScale();
  const pressed = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressed.value) }],
  }));

  return (
    <Animated.View 
      entering={FadeInDown.delay(delay).springify()}
      layout={Layout.springify()}
      style={styles.wrapper}
    >
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPressIn={() => (pressed.value = 0.96)}
          onPressOut={() => (pressed.value = 1)}
          onPress={onPress}
          disabled={!onPress}
          accessible={true}
          accessibilityRole={onPress ? "button" : "none"}
          accessibilityLabel={`${label}: ${value}`}
          accessibilityHint={onPress ? `Tap to open ${label} details` : undefined}
        >
          <LinearGradient
            colors={isDark ? ['#1E293B', '#0F172A'] : ['#FFFFFF', '#F8FAFC']}
            style={[styles.card, { borderColor: colors.border }]}
          >
            <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
              <Ionicons name={icon} size={24} color={iconColor} />
            </View>
            <View style={styles.textContainer}>
              <Text 
                style={[styles.label, { color: colors.textSecondary, fontSize: 13 * scale }]}
                maxFontSizeMultiplier={1.5}
              >
                {label}
              </Text>
              <Text
                style={[
                  styles.value,
                  { color: valueColor ?? colors.text, fontSize: 16 * scale },
                ]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.5}
              >
                {value}
              </Text>
            </View>
            {onPress && (
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 12,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: { flex: 1 },
  label: { fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  value: { fontWeight: '800' },
});
