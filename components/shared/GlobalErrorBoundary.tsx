import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Linking, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.logErrorToSupabase(error, errorInfo);
  }

  logErrorToSupabase = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      const user = useUserStore.getState().profile;
      await supabase.rpc('log_security_event', {
        event_name: 'APP_CRASH',
        severity_level: 'critical',
        details: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
        }),
        user_id: user?.id || null,
      });
    } catch (e) {
      console.error('Failed to log error to telemetry:', e);
    }
  };

  handleReset = async () => {
    try {
      await Updates.reloadAsync();
    } catch (e) {
      this.setState({ hasError: false, error: null });
    }
  };

  handleCallSOS = () => {
    const user = useUserStore.getState().profile;
    const phone = user?.emergencyContacts?.[0]?.phone || '911';
    Linking.openURL(`tel:${phone}`);
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="medical" size={64} color="#EF4444" />
            </View>
            
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              SeniorCare Hub encountered an unexpected error. Don't worry, your caregiver has been notified.
            </Text>

            <TouchableOpacity style={styles.button} onPress={this.handleReset}>
              <Ionicons name="refresh" size={20} color="#FFF" />
              <Text style={styles.buttonText}>Restart Application</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.sosButton]} onPress={this.handleCallSOS}>
              <Ionicons name="call" size={20} color="#FFF" />
              <Text style={styles.buttonText}>Emergency Call</Text>
            </TouchableOpacity>

            {__DEV__ && (
              <ScrollView style={styles.debugScroll}>
                <Text style={styles.debugText}>{this.state.error?.toString()}</Text>
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 48,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    gap: 12,
    marginBottom: 16,
    // Add accessibility
  },
  sosButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  debugScroll: {
    marginTop: 24,
    maxHeight: 200,
    width: '100%',
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 8,
  },
  debugText: {
    color: '#0F0',
    fontFamily: 'monospace',
    fontSize: 12,
  },
});
