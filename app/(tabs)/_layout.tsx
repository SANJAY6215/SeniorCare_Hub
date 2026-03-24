import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Pressable, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  useSharedValue,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';
import { useUserStore } from '@/stores/userStore';
import { Spacing, Radius } from '@/constants/Typography';
import NameSetupModal from '@/components/NameSetupModal';
import VoiceAssistant from '@/components/voice/VoiceAssistant';

const { width } = Dimensions.get('window');
const TAB_BAR_WIDTH = width - Spacing.lg * 2;
const TAB_WIDTH = TAB_BAR_WIDTH / 5;

function CustomTabBar({ state, descriptors, navigation }: any) {
  const { colors, isDark } = useTheme();
  const translateX = useSharedValue(state.index * TAB_WIDTH);

  useEffect(() => {
    translateX.value = withSpring(state.index * TAB_WIDTH, {
      damping: 15,
      stiffness: 120,
    });
  }, [state.index]);

  const highlighterStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[styles.tabBarContainer, { bottom: Platform.OS === 'ios' ? 30 : 20 }]}>
      <BlurView
        intensity={isDark ? 40 : 80}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.blurContainer,
          { 
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.8)',
            borderColor: colors.border,
          }
        ]}
      >
        {/* Sliding Highlighter */}
        <Animated.View style={[styles.highlighter, highlighterStyle]}>
          <LinearGradient
            colors={colors.primaryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.highlighterGradient}
          />
        </Animated.View>

        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
          if (Platform.OS !== 'web') {
            Haptics.selectionAsync();
          }
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const label = options.tabBarLabel ?? options.title ?? route.name;
          const iconName = options.tabBarIconName ?? 'help';

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
            >
              <TabIcon 
                name={iconName} 
                focused={isFocused} 
                colors={colors} 
              />
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

function TabIcon({ name, focused, colors }: any) {
  const scale = useSharedValue(focused ? 1.2 : 1);
  const opacity = useSharedValue(focused ? 1 : 0.6);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.2 : 1);
    opacity.value = withTiming(focused ? 1 : 0.6);
  }, [focused]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
      <Ionicons
        name={focused ? name : `${name}-outline`}
        size={24}
        color={focused ? '#FFF' : colors.textSecondary}
      />
    </Animated.View>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarLabel: 'Home',
            tabBarIconName: 'home',
          } as any}
        />
        <Tabs.Screen
          name="medications"
          options={{
            tabBarLabel: 'Meds',
            tabBarIconName: 'medical',
          } as any}
        />
        <Tabs.Screen
          name="health"
          options={{
            tabBarLabel: 'Health',
            tabBarIconName: 'heart',
          } as any}
        />
        <Tabs.Screen
          name="appointments"
          options={{
            tabBarLabel: 'Appts',
            tabBarIconName: 'calendar',
          } as any}
        />
        <Tabs.Screen
          name="family"
          options={{
            tabBarLabel: 'Family',
            tabBarIconName: 'people',
          } as any}
        />
      </Tabs>
      <NameSetupModal />
      <VoiceAssistant />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blurContainer: {
    width: TAB_BAR_WIDTH,
    height: 64,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  highlighter: {
    position: 'absolute',
    width: TAB_WIDTH - 8,
    height: 52,
    left: 4,
    borderRadius: Radius.full,
    padding: 2,
  },
  highlighterGradient: {
    flex: 1,
    borderRadius: Radius.full,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
