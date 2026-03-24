import React, { useRef, useCallback } from 'react';
import {
  TouchableOpacity,
  Animated,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  AccessibilityRole,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { TOUCH_TARGET } from '@/constants/Typography';

interface AccessibleButtonProps {
  label: string;
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  onPress: () => void;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  children?: React.ReactNode;
}

export default function AccessibleButton({
  label,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  onPress,
  backgroundColor,
  textColor,
  fontSize = 16,
  style,
  textStyle,
  disabled = false,
  children,
}: AccessibleButtonProps) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.timing(scale, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.timing(scale, {
      toValue: 1.0,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessible
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole={accessibilityRole}
        accessibilityState={{ disabled }}
        style={[
          styles.button,
          {
            backgroundColor: backgroundColor ?? colors.primary,
            minHeight: TOUCH_TARGET,
            opacity: disabled ? 0.5 : 1,
          },
          style,
        ]}
      >
        {children ?? (
          <Text
            style={[
              styles.label,
              { color: textColor ?? '#FFFFFF', fontSize },
              textStyle,
            ]}
            maxFontSizeMultiplier={1.5}
          >
            {label}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: TOUCH_TARGET,
    minHeight: TOUCH_TARGET,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  label: {
    fontWeight: '700',
    textAlign: 'center',
  },
});
