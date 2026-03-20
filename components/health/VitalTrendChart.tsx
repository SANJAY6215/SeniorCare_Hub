import React from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '@/hooks/useTheme';
import { Radius, Spacing } from '@/constants/Typography';

interface VitalTrendChartProps {
  data: number[];
  labels: string[];
  unit: string;
  color: string;
  title: string;
}

export default function VitalTrendChart({ data, labels, unit, color, title }: VitalTrendChartProps) {
  const { colors, isDark } = useTheme();
  const screenWidth = Dimensions.get('window').width - (Spacing.lg * 2);

  if (data.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={{ color: colors.textSecondary }}>Log more readings to see trends.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <LineChart
        data={{
          labels: labels,
          datasets: [{ data: data, color: () => color, strokeWidth: 3 }],
        }}
        width={screenWidth}
        height={200}
        yAxisSuffix={unit}
        chartConfig={{
          backgroundColor: colors.surface,
          backgroundGradientFrom: colors.surface,
          backgroundGradientTo: colors.surface,
          decimalPlaces: 0,
          color: (opacity = 1) => color,
          labelColor: (opacity = 1) => colors.textSecondary,
          style: { borderRadius: 16 },
          propsForDots: { r: '4', strokeWidth: '2', stroke: color },
          propsForBackgroundLines: { strokeDasharray: '', stroke: colors.border },
        }}
        bezier
        style={{ marginVertical: 8, borderRadius: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.md, borderRadius: Radius.xl, borderWidth: 1, marginBottom: Spacing.lg, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  title: { fontWeight: '800', marginBottom: 8, fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { height: 100, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.xl, borderWidth: 1, marginBottom: Spacing.lg },
});
