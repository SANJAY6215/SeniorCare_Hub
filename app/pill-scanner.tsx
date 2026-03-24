import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, Alert, Dimensions, ScrollView } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useUserStore } from '../stores/userStore';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PremiumModal from '../components/premium/PremiumModal';

const { width, height } = Dimensions.get('window');

export default function PillScanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const { profile, updateProfile } = useUserStore();

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (!profile?.isPremium) {
      setShowPremiumModal(true);
      return;
    }
    if (!cameraRef.current || isScanning) return;

    try {
      setIsScanning(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
      if (!photo) throw new Error("Could not capture photo");
      
      // Resize to reduce payload size
      const manipulated = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 800 } }],
        { base64: true, format: ImageManipulator.SaveFormat.JPEG }
      );

      if (!manipulated.base64) throw new Error("Could not process image");

      // Call Gemini Vision API directly
      const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      if (!GEMINI_API_KEY) throw new Error("Gemini API key not configured");

      const prompt = `
        Analyze this pill/medication image for a senior citizen.
        Identify the medication name, typical dosage, color, and shape.
        Mention what it is usually used for and any critical warnings (like 'avoid alcohol' or 'take with food').

        Return ONLY a JSON object with this exact structure:
        {
          "pillName": "string",
          "dosage": "string",
          "description": "string (color, shape, markings)",
          "usage": "string (what it's for)",
          "warnings": ["string (list of critical warnings)"],
          "recommendation": "string (advice on how to take it)"
        }
      `;

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inlineData: { mimeType: "image/jpeg", data: manipulated.base64 } }
              ]
            }]
          })
        }
      );

      const geminiData = await geminiResponse.json();
      const resultText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!resultText) {
        throw new Error("Pill not identified. Please ensure the pill is clearly visible in the frame with good lighting.");
      }

      // Parse JSON
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      const data = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(resultText);

      setResult(data);

    } catch (err: any) {
      Alert.alert("Identification Failed", err.message);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <View style={styles.container}>
      <PremiumModal 
        visible={showPremiumModal} 
        onClose={() => setShowPremiumModal(false)}
      />
      {!result ? (
        <CameraView style={styles.camera} ref={cameraRef} facing="back">
          <View style={[styles.overlay, { paddingTop: Math.max(insets.top, 20) }]}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={28} color="white" />
            </TouchableOpacity>
            
            <View style={styles.scanFrame}>
              <View style={styles.cornerTL} />
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
              <View style={styles.cornerBR} />
            </View>
            
            <View style={styles.controls}>
              <Text style={styles.hint}>Place the pill in the frame and tap</Text>
              <TouchableOpacity 
                style={[styles.captureBtn, isScanning && { opacity: 0.5 }]} 
                onPress={takePicture}
                disabled={isScanning}
              >
                {isScanning ? (
                  <ActivityIndicator color="white" size="large" />
                ) : (
                  <View style={styles.captureBtnInner} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      ) : (
        <View style={styles.resultContainer}>
          <LinearGradient colors={['#F8FAFC', '#F1F5F9']} style={StyleSheet.absoluteFill} />
          <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 30) }]}>
            <View style={styles.resultHeader}>
              <Ionicons name="medical" size={64} color="#6366F1" />
              <Text style={styles.pillTitle}>{result.pillName}</Text>
              <Text style={styles.pillSubtitle}>{result.dosage}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionHeader}>Description</Text>
              <Text style={styles.infoText}>{result.description}</Text>
              
              <View style={styles.divider} />
              
              <Text style={styles.sectionHeader}>What it's for</Text>
              <Text style={styles.infoText}>{result.usage}</Text>
              
              <View style={styles.divider} />
              
              <Text style={styles.sectionHeader}>Warnings</Text>
              {result.warnings.map((warning: string, i: number) => (
                <View key={i} style={styles.warningItem}>
                  <Ionicons name="alert-circle" size={20} color="#EF4444" />
                  <Text style={styles.warningText}>{warning}</Text>
                </View>
              ))}

              <View style={styles.divider} />
              
              <Text style={styles.sectionHeader}>How to take</Text>
              <Text style={styles.adviceText}>{result.recommendation}</Text>
            </View>

            <TouchableOpacity style={styles.addButton} onPress={() => router.push('/(tabs)/medications')}>
              <Text style={styles.addButtonText}>Add to Medication List</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.resetButton} onPress={() => setResult(null)}>
              <Text style={styles.resetButtonText}>Scan Another Pill</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 50,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: width * 0.5,
    height: width * 0.5,
    alignSelf: 'center',
    position: 'relative',
  },
  cornerTL: { position: 'absolute', top: 0, left: 0, width: 30, height: 30, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#6366F1' },
  cornerTR: { position: 'absolute', top: 0, right: 0, width: 30, height: 30, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#6366F1' },
  cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 30, height: 30, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#6366F1' },
  cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#6366F1' },
  controls: {
    alignItems: 'center',
    marginBottom: 40,
  },
  hint: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#6366F1',
  },
  captureBtnInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366F1',
  },
  message: {
    textAlign: 'center',
    color: 'white',
    fontSize: 18,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#6366F1',
    padding: 15,
    borderRadius: 10,
    alignSelf: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  resultContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  pillTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 16,
    textAlign: 'center',
  },
  pillSubtitle: {
    fontSize: 20,
    color: '#64748B',
    marginTop: 4,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 18,
    color: '#334155',
    lineHeight: 26,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
  },
  warningText: {
    flex: 1,
    color: '#991B1B',
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
  adviceText: {
    fontSize: 18,
    color: '#1E293B',
    lineHeight: 26,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#10B981',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resetButton: {
    borderColor: '#6366F1',
    borderWidth: 2,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#6366F1',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
