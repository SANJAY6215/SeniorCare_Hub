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

export default function FoodScanner() {
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
        Analyze this food image for a senior citizen.
        Identify the food, estimate calories, and check if it's safe for someone with high blood pressure.
        Be strict about sodium content.

        Return ONLY a JSON object with this exact structure:
        {
          "foodName": "string",
          "calories": number,
          "nutrients": { "sodium": "string", "sugar": "string", "fats": "string" },
          "safetyStatus": "safe" | "caution" | "unsafe",
          "healthAdvice": "string (concise reasoning)",
          "concludingStatement": "Short sentence summarizing the result"
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
      if (!resultText) throw new Error("AI could not analyze the image. Please try again.");

      // Parse JSON from Gemini response
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      const data = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(resultText);

      setResult(data);

      // Log to DB (optional, won't block if table doesn't exist)
      try {
        await supabase.from('food_scans').insert({
          user_id: profile?.id,
          food_name: data.foodName,
          calories: data.calories,
          nutrients: data.nutrients,
          safety_status: data.safetyStatus,
          health_advice: data.healthAdvice
        });
      } catch (dbErr) {
        console.log('Food scan logging skipped:', dbErr);
      }

    } catch (err: any) {
      Alert.alert("Analysis Failed", err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe': return '#22C55E';
      case 'caution': return '#F59E0B';
      case 'unsafe': return '#EF4444';
      default: return '#64748B';
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
            
            <View style={styles.scanFrame} />
            
            <View style={styles.controls}>
              <Text style={styles.hint}>Point at your meal and tap the button</Text>
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
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={[styles.statusBanner, { backgroundColor: getStatusColor(result.safetyStatus), paddingTop: Math.max(insets.top, 30) }]}>
              <Ionicons 
                name={result.safetyStatus === 'safe' ? 'checkmark-circle' : result.safetyStatus === 'caution' ? 'warning' : 'alert-circle'} 
                size={48} 
                color="white" 
              />
              <Text style={styles.statusText}>{result.concludingStatement}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.foodTitle}>{result.foodName}</Text>
              <Text style={styles.caloriesText}>{result.calories} Calories</Text>
              
              <View style={styles.divider} />
              
              <Text style={styles.sectionHeader}>Why this status?</Text>
              <Text style={styles.adviceText}>{result.healthAdvice}</Text>

              <View style={styles.nutrientsGrid}>
                <View style={styles.nutrientItem}>
                  <Text style={styles.nutrientLabel}>Sodium</Text>
                  <Text style={styles.nutrientValue}>{result.nutrients.sodium}</Text>
                </View>
                <View style={styles.nutrientItem}>
                  <Text style={styles.nutrientLabel}>Sugar</Text>
                  <Text style={styles.nutrientValue}>{result.nutrients.sugar}</Text>
                </View>
                <View style={styles.nutrientItem}>
                  <Text style={styles.nutrientLabel}>Fats</Text>
                  <Text style={styles.nutrientValue}>{result.nutrients.fats}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.resetButton} onPress={() => setResult(null)}>
              <Text style={styles.resetButtonText}>Scan Another Item</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.homeButton} onPress={() => router.replace('/(tabs)')}>
              <Text style={styles.homeButtonText}>Back to Dashboard</Text>
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
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
    padding: 20,
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
    width: width * 0.7,
    height: width * 0.7,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 20,
    alignSelf: 'center',
    backgroundColor: 'transparent',
  },
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
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  captureBtnInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  message: {
    textAlign: 'center',
    color: 'white',
    fontSize: 18,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#22C55E',
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
    paddingBottom: 40,
  },
  statusBanner: {
    padding: 30,
    paddingTop: 60,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  statusText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 15,
  },
  card: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: -20,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  foodTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  caloriesText: {
    fontSize: 20,
    color: '#64748B',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  adviceText: {
    fontSize: 18,
    lineHeight: 26,
    color: '#334155',
  },
  nutrientsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  nutrientItem: {
    flex: 1,
    alignItems: 'center',
  },
  nutrientLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  nutrientValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  resetButton: {
    backgroundColor: '#22C55E',
    marginHorizontal: 30,
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  homeButton: {
    borderColor: '#22C55E',
    borderWidth: 2,
    marginHorizontal: 30,
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 15,
  },
  homeButtonText: {
    color: '#22C55E',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
