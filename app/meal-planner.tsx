import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';
import { useTextScale } from '@/hooks/useTheme';
import { useMealStore, Meal } from '@/stores/mealStore';
import { useUserStore } from '@/stores/userStore';
import { Spacing, Radius } from '@/constants/Typography';

export default function MealPlannerScreen() {
  const { colors } = useTheme();
  const scale = useTextScale();
  const router = useRouter();
  const { weeklyPlan, generateAIPlan, logMealConsumption, loading } = useMealStore();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().split('T')[0]);
  }

  const dailyMeals = weeklyPlan.filter(m => m.day === selectedDate);

  const handleGenerate = async () => {
    Alert.alert(
      'Generate New Plan',
      'AI will analyze your recent vitals and dietary goals to create a personalized 7-day meal plan. This takes about 10 seconds.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Generate ✨', onPress: generateAIPlan }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'AI Meal Planner', headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text, fontSize: 24 * scale }]}>Meal Planner</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Gemini Proactive Nutrition</Text>
        </View>
        <TouchableOpacity onPress={handleGenerate} disabled={loading} style={[styles.refreshBtn, { backgroundColor: colors.primary }]}>
          {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="sparkles" size={20} color="#FFF" />}
        </TouchableOpacity>
      </View>

      {/* Date Selector */}
      <View style={styles.dateSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.md }}>
          {days.map(date => {
            const d = new Date(date);
            const isSelected = selectedDate === date;
            return (
              <TouchableOpacity
                key={date}
                onPress={() => setSelectedDate(date)}
                style={[styles.dateChip, { backgroundColor: isSelected ? colors.primary : colors.surface, borderColor: isSelected ? colors.primary : colors.border }]}
              >
                <Text style={[styles.dateDay, { color: isSelected ? '#FFF' : colors.textSecondary }]}>{d.toLocaleDateString([], { weekday: 'short' })}</Text>
                <Text style={[styles.dateNum, { color: isSelected ? '#FFF' : colors.text }]}>{d.getDate()}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 16, color: colors.textSecondary, fontWeight: '700' }}>AI is analyzing your vitals...</Text>
          </View>
        ) : dailyMeals.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="restaurant-outline" size={48} color={colors.textMuted} />
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 12, fontWeight: '600' }}>
              No meal plan generated yet. Tap the magic button above to create one!
            </Text>
          </View>
        ) : (
          dailyMeals.map((meal, i) => (
            <Animated.View key={meal.id} entering={FadeInDown.delay(i * 100).springify()} layout={Layout.springify()}>
              <TouchableOpacity
                onPress={() => logMealConsumption(meal.id)}
                style={[styles.mealCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.mealIconBox}>
                  <Ionicons name={meal.type === 'breakfast' ? 'sunny' : meal.type === 'lunch' ? 'fast-food' : 'moon'} size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.mealType, { color: colors.primary }]}>{meal.type.toLocaleUpperCase()}</Text>
                  <Text style={[styles.mealName, { color: colors.text }]}>{meal.name}</Text>
                  <View style={styles.benefitsRow}>
                    {meal.benefits.map((b, bi) => (
                      <View key={bi} style={[styles.benefitBadge, { backgroundColor: colors.success + '15' }]}>
                        <Text style={[styles.benefitText, { color: colors.success }]}>{b}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={styles.calBox}>
                    <Text style={[styles.calNum, { color: colors.text }]}>{meal.calories}</Text>
                    <Text style={[styles.calLabel, { color: colors.textSecondary }]}>kcal</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))
        )}

        {/* Nutritional Summary (Premium Feature) */}
        {!loading && dailyMeals.length > 0 && (
          <Animated.View entering={FadeInUp.delay(500)} style={[styles.summaryCard, { backgroundColor: colors.primaryGradient[0] }]}>
            <Text style={styles.summaryTitle}>Daily Target Reached!</Text>
            <Text style={styles.summaryText}>This plan reduces your sodium intake by 15% based on your recent blood pressure readings.</Text>
            <View style={styles.progressRow}>
                <View style={styles.progressItem}>
                    <Text style={styles.progressNum}>92%</Text>
                    <Text style={styles.progressLabel}>Health Score</Text>
                </View>
                <View style={styles.vLine} />
                <View style={styles.progressItem}>
                    <Text style={styles.progressNum}>24g</Text>
                    <Text style={styles.progressLabel}>Protein</Text>
                </View>
            </View>
          </Animated.View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xl, gap: Spacing.md },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title: { fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, fontWeight: '600', opacity: 0.6 },
  refreshBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  dateSelector: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  dateChip: { width: 60, height: 75, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  dateDay: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  dateNum: { fontSize: 18, fontWeight: '900' },
  content: { padding: Spacing.lg },
  loadingBox: { padding: 60, alignItems: 'center' },
  emptyBox: { padding: 40, borderRadius: Radius.xl, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center' },
  mealCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderRadius: Radius.xl, borderWidth: 1, marginBottom: Spacing.md, gap: Spacing.md },
  mealIconBox: { width: 52, height: 52, borderRadius: Radius.md, backgroundColor: 'rgba(99, 102, 241, 0.1)', alignItems: 'center', justifyContent: 'center' },
  mealType: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  mealName: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  benefitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  benefitBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  benefitText: { fontSize: 10, fontWeight: '800' },
  calBox: { alignItems: 'flex-end' },
  calNum: { fontSize: 18, fontWeight: '900' },
  calLabel: { fontSize: 11, fontWeight: '600' },
  summaryCard: { padding: 24, borderRadius: Radius.xl, marginTop: Spacing.xl, elevation: 8 },
  summaryTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  summaryText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', marginTop: 4, lineHeight: 18 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 20 },
  progressItem: { flex: 1, alignItems: 'center' },
  progressNum: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  progressLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
  vLine: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
});
