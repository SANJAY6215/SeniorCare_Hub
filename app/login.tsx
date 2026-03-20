import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [role, setRole] = useState<'senior' | 'caregiver'>('senior');
  const [familyCode, setFamilyCode] = useState('');
  const router = useRouter();

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        let linked_senior_id = null;

        if (role === 'caregiver') {
          if (!familyCode.trim()) {
            throw new Error('Family Invite Code is required for Caregivers.');
          }

          // Validate Family Code
          const { data, error: fetchError } = await supabase
            .from('profiles')
            .select('id')
            .eq('family_code', familyCode.trim().toUpperCase())
            .single();

          if (fetchError || !data) {
            throw new Error('Invalid Family Invite Code. Please verify with the Senior.');
          }
          linked_senior_id = data.id;
        }

        const { data: authData, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { role, linked_senior_id }
          }
        });
        if (error) throw error;
        
        // Supabase returns fake success if email exists to prevent enumeration. 
        // We catch it by checking for empty identities.
        if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        }

        Alert.alert('Success', 'Account successfully created!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      Alert.alert('Authentication Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="heart" size={48} color="#22C55E" />
            </View>
            <Text style={styles.title}>SeniorCare Hub</Text>
            <Text style={styles.subtitle}>
              {isSignUp ? 'Create your care account' : 'Welcome back to your health hub'}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={24} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={24} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {isSignUp && (
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  style={[styles.roleButton, role === 'senior' && styles.roleButtonActive]}
                  onPress={() => setRole('senior')}
                >
                  <Text style={[styles.roleText, role === 'senior' && styles.roleTextActive]}>I am a Senior</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleButton, role === 'caregiver' && styles.roleButtonActive]}
                  onPress={() => setRole('caregiver')}
                >
                  <Text style={[styles.roleText, role === 'caregiver' && styles.roleTextActive]}>I am a Caregiver</Text>
                </TouchableOpacity>
              </View>
            )}

            {isSignUp && role === 'caregiver' && (
              <View style={styles.inputContainer}>
                <Ionicons name="key-outline" size={24} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Family Invite Code"
                  value={familyCode}
                  onChangeText={setFamilyCode}
                  autoCapitalize="characters"
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{isSignUp ? 'Sign Up' : 'Sign In'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setIsSignUp(!isSignUp)}
            >
              <Text style={styles.switchText}>
                {isSignUp
                  ? 'Already have an account? Sign In'
                  : "Don't have an account? Sign Up"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#64748B',
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    height: 60,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
  },
  button: {
    backgroundColor: '#22C55E',
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  switchButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  switchText: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: '600',
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  roleButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  roleButtonActive: {
    borderColor: '#22C55E',
    backgroundColor: '#DCFCE7',
  },
  roleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  roleTextActive: {
    color: '#22C55E',
  },
});
