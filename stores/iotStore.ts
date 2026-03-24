import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';
import { useVitalsStore } from '@/stores/vitalsStore';
import { Alert } from 'react-native';

export interface IoTDevice {
  id: string;
  name: string;
  brand: 'Withings' | 'Apple' | 'Fitbit' | 'Hero' | 'Dexcom';
  type: 'scale' | 'watch' | 'bp_cuff' | 'pill_dispenser' | 'cgm';
  connectedAt: string;
  lastSync?: string;
  status: 'online' | 'offline' | 'syncing';
}

interface IoTStore {
  devices: IoTDevice[];
  loading: boolean;
  
  fetchDevices: () => Promise<void>;
  connectDevice: (device: Omit<IoTDevice, 'id' | 'connectedAt' | 'status'>) => Promise<void>;
  disconnectDevice: (id: string) => Promise<void>;
  syncData: (deviceId: string) => Promise<void>;
}

export const useIoTStore = create<IoTStore>((set, get) => ({
  devices: [],
  loading: false,

  fetchDevices: async () => {
    set({ loading: true });
    // In a real scenario, this would fetch from a 'user_devices' table
    // For now, we use a mock persistent list for the demo
    const targetUserId = useUserStore.getState().getTargetUserId();
    if (!targetUserId) {
        set({ loading: false });
        return;
    }

    // Mock delay
    await new Promise(r => setTimeout(r, 1000));
    set({ loading: false });
  },

  connectDevice: async (device) => {
    const newDevice: IoTDevice = {
      ...device,
      id: Math.random().toString(36).substr(2, 9),
      connectedAt: new Date().toISOString(),
      status: 'online',
    };

    set(state => ({ devices: [...state.devices, newDevice] }));
    
    // Security Audit Log
    const targetUserId = useUserStore.getState().getTargetUserId();
    await supabase.rpc('log_security_event', {
      event_name: 'DEVICE_CONNECTED',
      details: `User connected a ${device.brand} ${device.type}.`,
      user_id: targetUserId,
      severity_level: 'info'
    });
  },

  disconnectDevice: async (id) => {
    set(state => ({ devices: state.devices.filter(d => d.id !== id) }));
  },

  syncData: async (deviceId) => {
    const device = get().devices.find(d => d.id === deviceId);
    if (!device) return;

    set(state => ({
      devices: state.devices.map(d => d.id === deviceId ? { ...d, status: 'syncing' } : d)
    }));

    // Mock API Call to Device Manufacturer
    await new Promise(r => setTimeout(r, 2000));

    // Simulate pushing data to VitalsStore
    if (device.type === 'bp_cuff') {
        const { addReading } = useVitalsStore.getState();
        await addReading({
            type: 'bp',
            value: '118/72',
            unit: 'mmHg',
            measured_at: new Date().toISOString(),
            status: 'normal',
            notes: `Auto-synced from ${device.brand} Smart Cuff`
        });
    } else if (device.type === 'watch') {
        const { addReading } = useVitalsStore.getState();
        await addReading({
            type: 'hr',
            value: '68',
            unit: 'bpm',
            measured_at: new Date().toISOString(),
            status: 'normal',
            notes: `Auto-synced from ${device.brand} Watch`
        });
    }

    set(state => ({
      devices: state.devices.map(d => d.id === deviceId ? { ...d, status: 'online', lastSync: new Date().toISOString() } : d)
    }));

    Alert.alert('Sync Complete', `Data from your ${device.brand} ${device.type} has been successfully imported.`);
  }
}));
