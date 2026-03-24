import React, { useState } from 'react';
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
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';
import { useTextScale } from '@/hooks/useTheme';
import { useIoTStore, IoTDevice } from '@/stores/iotStore';
import { Spacing, Radius } from '@/constants/Typography';

const AVAILABLE_DEVICES = [
  { brand: 'Withings', type: 'bp_cuff', name: 'Smart Blood Pressure Monitor', icon: 'heart', color: '#F43F5E' },
  { brand: 'Apple', type: 'watch', name: 'Apple Watch Series 9', icon: 'watch', color: '#8B5CF6' },
  { brand: 'Fitbit', type: 'watch', name: 'Fitbit Sense 2', icon: 'pulse', color: '#06B6D4' },
  { brand: 'Hero', type: 'pill_dispenser', name: 'Hero Smart Dispenser', icon: 'medkit', color: '#10B981' },
  { brand: 'Dexcom', type: 'cgm', name: 'Dexcom G7 CGM', icon: 'water', color: '#F59E0B' },
];

export default function IoTConnectScreen() {
  const { colors, isDark } = useTheme();
  const scale = useTextScale();
  const router = useRouter();
  const { devices, connectDevice, disconnectDevice, syncData, loading } = useIoTStore();
  const [connecting, setConnecting] = useState<string | null>(null);

  const handleConnect = async (dev: any) => {
    setConnecting(dev.brand);
    // Simulate Bluetooth pairing
    await new Promise(r => setTimeout(r, 2000));
    
    await connectDevice({
      brand: dev.brand,
      type: dev.type,
      name: dev.name,
    });
    
    setConnecting(null);
    Alert.alert('Device Linked', `Your ${dev.brand} ${dev.name} is now securely connected and will sync vitals automatically.`);
  };

  const handleSync = async (deviceId: string) => {
    try {
      await syncData(deviceId);
    } catch (e) {
      Alert.alert('Sync Failed', 'Could not reach the device server. Please try again later.');
    }
  };

  const handleRemove = (id: string, name: string) => {
    Alert.alert('Disconnect Device', `Are you sure you want to disconnect ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: () => disconnectDevice(id) },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'IoT Hub', headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: colors.text, fontSize: 24 * scale }]}>Smart Home Hub</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Link your health devices</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Active Devices */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CONNECTED DEVICES ({devices.length})</Text>
        {devices.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="bluetooth" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No devices linked yet. Search below to add your smart health hardware.</Text>
          </View>
        ) : (
          devices.map((dev, i) => (
            <Animated.View key={dev.id} entering={FadeInDown.delay(i * 100).springify()} style={[styles.deviceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons 
                  name={AVAILABLE_DEVICES.find(d => d.brand === dev.brand)?.icon as any || 'bluetooth'} 
                  size={24} 
                  color={colors.primary} 
                />
              </View>
              <View style={styles.deviceInfo}>
                <Text style={[styles.deviceName, { color: colors.text }]}>{dev.name}</Text>
                <Text style={[styles.deviceSub, { color: colors.textSecondary }]}>
                  {dev.status === 'syncing' ? 'Syncing...' : `Last sync: ${dev.lastSync ? new Date(dev.lastSync).toLocaleTimeString() : 'Never'}`}
                </Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity 
                  onPress={() => handleSync(dev.id)} 
                  disabled={dev.status === 'syncing'}
                  style={[styles.syncBtn, { backgroundColor: colors.primaryGradient[0] }]}
                >
                  {dev.status === 'syncing' ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Ionicons name="sync" size={18} color="#FFF" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleRemove(dev.id, dev.name)} style={styles.removeBtn}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </Animated.View>
          ))
        )}

        {/* Discovery Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: Spacing.xl }]}>DISCOVER DEVICES</Text>
        {AVAILABLE_DEVICES.filter(d => !devices.some(ex => ex.brand === d.brand)).map((dev, i) => (
          <Animated.View key={dev.brand} entering={FadeInRight.delay(i * 100).springify()}>
            <TouchableOpacity 
              onPress={() => handleConnect(dev)}
              disabled={connecting !== null}
              style={[styles.discoverCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={[styles.discoverIcon, { backgroundColor: dev.color + '15' }]}>
                <Ionicons name={dev.icon as any} size={24} color={dev.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.discoverName, { color: colors.text }]}>{dev.name}</Text>
                <Text style={[styles.discoverBrand, { color: colors.textSecondary }]}>{dev.brand} Health Cloud</Text>
              </View>
              {connecting === dev.brand ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Ionicons name="add-circle" size={28} color={colors.primary} />
              )}
            </TouchableOpacity>
          </Animated.View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Info Banner */}
      <View style={[styles.infoBanner, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
        <Ionicons name="information-circle" size={20} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.primary }]}>Your health data is encrypted end-to-end during device synchronization.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xl },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title: { fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { fontWeight: '600', opacity: 0.6, fontSize: 13 },
  content: { padding: Spacing.lg },
  sectionTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5, marginBottom: Spacing.md },
  emptyCard: { padding: Spacing.xxl, borderRadius: Radius.xl, borderWidth: 1, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', gap: 12 },
  emptyText: { textAlign: 'center', fontSize: 14, fontWeight: '500', lineHeight: 20 },
  deviceCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderRadius: Radius.xl, borderWidth: 1, marginBottom: Spacing.md },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  deviceInfo: { flex: 1, marginLeft: Spacing.md },
  deviceName: { fontSize: 16, fontWeight: '800' },
  deviceSub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  syncBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  removeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  discoverCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderRadius: Radius.xl, borderWidth: 1, marginBottom: Spacing.md },
  discoverIcon: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  discoverName: { fontSize: 15, fontWeight: '700' },
  discoverBrand: { fontSize: 12, fontWeight: '500' },
  infoBanner: { position: 'absolute', bottom: 40, left: 24, right: 24, flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: Radius.lg, borderWidth: 1, gap: 12 },
  infoText: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 18 },
});
