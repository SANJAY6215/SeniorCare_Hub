import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Radius, Spacing } from '@/constants/Typography';

export default function AdBannerPlaceholder({ onPressPremium }: { onPressPremium: () => void }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.adBadge}>
        <Text style={styles.adBadgeText}>ADVERTISEMENT</Text>
      </View>
      
      <View style={styles.content}>
        <Ionicons name="sparkles" size={24} color={colors.primary} style={styles.icon} />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Tired of seeing ads?</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Upgrade to Premium for an ad-free experience & AI scanners.</Text>
        </View>
        <TouchableOpacity style={[styles.upgradeBtn, { backgroundColor: colors.primary }]} onPress={onPressPremium}>
          <Text style={styles.upgradeBtnText}>UPGRADE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  adBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#94A3B8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderBottomLeftRadius: 8,
  },
  adBadgeText: {
    fontSize: 8,
    color: '#FFF',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  upgradeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    marginLeft: 8,
  },
  upgradeBtnText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },
});
