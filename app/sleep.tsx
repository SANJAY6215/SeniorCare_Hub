import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useUserStore } from '../stores/userStore';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PremiumModal from '../components/premium/PremiumModal';

export default function SleepScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [sleepLogs, setSleepLogs] = useState<any[]>([]);
  const insets = useSafeAreaInsets();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  
  // Form state
  const [bedTime, setBedTime] = useState(new Date(new Date().setHours(22, 0, 0, 0)));
  const [wakeTime, setWakeTime] = useState(new Date(new Date().setHours(7, 0, 0, 0)));
  const [quality, setQuality] = useState(3);

  useEffect(() => {
    fetchSleepLogs();
  }, []);

  const fetchSleepLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sleep_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(7);
      
      if (error) throw error;
      setSleepLogs(data || []);
    } catch (err: any) {
      console.log('Error fetching sleep logs:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogSleep = async () => {
    try {
      setLoading(true);
      
      // Calculate duration in minutes
      const duration = (wakeTime.getTime() - bedTime.getTime()) / (1000 * 60);
      const finalDuration = duration < 0 ? duration + (24 * 60) : duration;

      const { error } = await supabase.from('sleep_logs').insert({
        user_id: profile?.id,
        bed_time: bedTime.toISOString(),
        wake_time: wakeTime.toISOString(),
        quality,
        duration_minutes: finalDuration
      });

      if (error) throw error;

      Alert.alert("Success", "Sleep logged successfully!");
      fetchSleepLogs();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const getQualityText = (q: number) => {
    switch (q) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return 'Unknown';
    }
  };

  const getQualityColor = (q: number) => {
    switch (q) {
      case 1: return '#EF4444';
      case 2: return '#F59E0B';
      case 3: return '#3B82F6';
      case 4: return '#10B981';
      case 5: return '#22C55E';
      default: return '#64748B';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <PremiumModal 
        visible={showPremiumModal} 
        onClose={() => setShowPremiumModal(false)}
      />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Sleep Tracker</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInDown} style={styles.card}>
          <Text style={styles.sectionTitle}>Log Last Night's Sleep</Text>
          
          <View style={styles.row}>
            <View style={styles.timeInput}>
              <Text style={styles.label}>Bed Time</Text>
              <Text style={styles.timeValue}>10:00 PM</Text>
              <Text style={styles.hint}>(Default)</Text>
            </View>
            <View style={styles.timeInput}>
              <Text style={styles.label}>Wake Time</Text>
              <Text style={styles.timeValue}>07:00 AM</Text>
              <Text style={styles.hint}>(Default)</Text>
            </View>
          </View>

          <Text style={styles.label}>Sleep Quality</Text>
          <View style={styles.qualityContainer}>
            {[1, 2, 3, 4, 5].map((q) => (
              <TouchableOpacity 
                key={q} 
                style={[styles.qualityBtn, quality === q && { backgroundColor: getQualityColor(q) }]}
                onPress={() => setQuality(q)}
              >
                <Text style={[styles.qualityBtnText, quality === q && { color: 'white' }]}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.qualityLabel, { color: getQualityColor(quality) }]}>
            {getQualityText(quality)}
          </Text>

          <TouchableOpacity 
            style={styles.logBtn} 
            onPress={handleLogSleep}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.logBtnText}>Save Log</Text>}
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.sectionTitle}>Sleep History (Last 7 Days)</Text>
        {!profile?.isPremium ? (
          <View style={styles.premiumBox}>
            <Ionicons name="lock-closed" size={48} color="#6366F1" />
            <Text style={styles.premiumBoxTitle}>Detailed History is Premium</Text>
            <Text style={styles.premiumBoxDesc}>Upgrade to Premium to track your sleep trends and get AI-powered insights.</Text>
            <TouchableOpacity style={styles.premiumBoxBtn} onPress={() => setShowPremiumModal(true)}>
              <Text style={styles.premiumBoxBtnText}>Upgrade Now</Text>
            </TouchableOpacity>
          </View>
        ) : loading && sleepLogs.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : sleepLogs.length === 0 ? (
          <Text style={styles.emptyText}>No sleep logs found. Start logging to see trends!</Text>
        ) : (
          sleepLogs.map((log, index) => (
            <Animated.View key={log.id} entering={FadeInDown.delay(index * 100)} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyDate}>
                  {new Date(log.created_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
                <View style={[styles.qualityBadge, { backgroundColor: getQualityColor(log.quality) + '20' }]}>
                  <Text style={[styles.qualityBadgeText, { color: getQualityColor(log.quality) }]}>
                    {getQualityText(log.quality)}
                  </Text>
                </View>
              </View>
              <View style={styles.historyBody}>
                <View style={styles.historyStat}>
                  <Text style={styles.statLabel}>Duration</Text>
                  <Text style={styles.statValue}>{(log.duration_minutes / 60).toFixed(1)} hrs</Text>
                </View>
                <View style={styles.historyStat}>
                  <Text style={styles.statLabel}>Bedtime</Text>
                  <Text style={styles.statValue}>
                    {new Date(log.bed_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    paddingTop: 40,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 24,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  timeInput: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    marginHorizontal: 4,
  },
  label: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
    textAlign: 'center',
  },
  timeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  hint: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },
  qualityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  qualityBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualityBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#64748B',
  },
  qualityLabel: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  logBtn: {
    backgroundColor: '#6366F1',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  logBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  historyCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  qualityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  qualityBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  historyBody: {
    flexDirection: 'row',
  },
  historyStat: {
    marginRight: 32,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 16,
    marginTop: 20,
  },
  premiumBox: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6366F1',
    borderStyle: 'dashed',
  },
  premiumBoxTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 16,
  },
  premiumBoxDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginVertical: 12,
    lineHeight: 20,
  },
  premiumBoxBtn: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  premiumBoxBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
