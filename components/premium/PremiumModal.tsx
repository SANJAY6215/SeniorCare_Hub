import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function PremiumModal({ visible, onClose }: PremiumModalProps) {
  const router = useRouter();
  
  const handleUpgradePress = () => {
    onClose();
    router.push('/pricing');
  };
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        </BlurView>
        
        <View style={styles.sheet}>
          <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.premiumHeader}>
            <Ionicons name="star" size={64} color="#FACC15" />
            <Text style={styles.premiumTitle}>Unlock Premium</Text>
            <Text style={styles.premiumSubtitle}>Get the ultimate care experience with advanced AI tools.</Text>
          </LinearGradient>

          <ScrollView style={styles.featuresScroll}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="fast-food" size={24} color="#6366F1" />
              </View>
              <View>
                <Text style={styles.featureTitle}>AI Food Scanner</Text>
                <Text style={styles.featureDesc}>Get instant safety & health advice for every meal.</Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="medical" size={24} color="#6366F1" />
              </View>
              <View>
                <Text style={styles.featureTitle}>Pill ID Search</Text>
                <Text style={styles.featureDesc}>Never mix up medications with AI pill identification.</Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="moon" size={24} color="#6366F1" />
              </View>
              <View>
                <Text style={styles.featureTitle}>Sleep Analysis</Text>
                <Text style={styles.featureDesc}>AI-driven trends and tips for better rest.</Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="mic" size={24} color="#6366F1" />
              </View>
              <View>
                <Text style={styles.featureTitle}>Voice Assistant</Text>
                <Text style={styles.featureDesc}>Full hands-free control and smart vital logging.</Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="shield-checkmark" size={24} color="#6366F1" />
              </View>
              <View>
                <Text style={styles.featureTitle}>Priority Caregiver Alerts</Text>
                <Text style={styles.featureDesc}>Get extra notifications for your family members.</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.upgradeBtn} onPress={handleUpgradePress}>
              <Text style={styles.upgradeBtnText}>View Pricing Plans</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: height * 0.85,
    overflow: 'hidden',
  },
  premiumHeader: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: 'white',
    marginTop: 16,
    letterSpacing: -1,
  },
  premiumSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  featuresScroll: {
    flex: 1,
    padding: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  featureIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  featureDesc: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
    maxWidth: width - 120,
  },
  buttonContainer: {
    padding: 24,
    paddingBottom: 40,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  upgradeBtn: {
    backgroundColor: '#6366F1',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  upgradeBtnText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  cancelBtn: {
    alignItems: 'center',
    marginTop: 16,
  },
  cancelBtnText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
