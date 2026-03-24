import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';

interface VoiceRecognitionSheetProps {
  visible: boolean;
  onResult: (transcript: string) => void;
  onClose: () => void;
}

export default function VoiceRecognitionSheet({ visible, onResult, onClose }: VoiceRecognitionSheetProps) {
  const webviewRef = useRef<WebView>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  useEffect(() => {
    if (visible && Platform.OS !== 'web') {
      (async () => {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Microphone permission not granted');
        }
      })();
    }
  }, [visible]);

  useEffect(() => {
    // Cleanup
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [recording]);

  const toggleRecording = async () => {
    try {
      if (isRecording) {
        setIsRecording(false);
        setIsProcessing(true);
        if (recording) {
          await recording.stopAndUnloadAsync();
          const uri = recording.getURI();
          setRecording(null);
          
          if (uri) {
            await processAudioWithGemini(uri);
          } else {
            setIsProcessing(false);
          }
        }
      } else {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording: newRec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        setRecording(newRec);
        setIsRecording(true);
      }
    } catch (err) {
      console.error('Recording error:', err);
      setIsRecording(false);
      setIsProcessing(false);
      Alert.alert('Error', 'Failed to start or stop recording.');
    }
  };

  const processAudioWithGemini = async (uri: string) => {
    try {
      const base64Audio = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      
      if (!GEMINI_API_KEY) {
        throw new Error("Missing Gemini API Key in .env");
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: "Accurately transcribe the following audio. Return ONLY the spoken text, nothing else. Do not add any extra markdown or formatting." },
                {
                  inline_data: {
                    mime_type: "audio/mp4",
                    data: base64Audio
                  }
                }
              ]
            }]
          })
        }
      );

      const data = await response.json();
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (resultText) {
        onResult(resultText.trim());
      } else {
        console.error("Gemini Transcription parsed failure:", data);
        Alert.alert("Transcription Error", "Could not understand the audio.");
      }
    } catch (e: any) {
      console.error("Gemini Transcription error:", e);
      Alert.alert("Processing Failed", e.message || "Failed to contact AI service.");
    } finally {
      setIsProcessing(false);
    }
  };

  const speechHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, system-ui, sans-serif; }
    body { background: #1e293b; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 20px; overflow: hidden; }

    #status { font-size: 18px; font-weight: 700; color: #6366F1; margin-bottom: 20px; text-align: center; line-height: 1.4; }
    #transcript { font-size: 22px; font-weight: 600; color: #1e293b; text-align: center; min-height: 60px; padding: 16px; background: #F1F5F9; border-radius: 16px; width: 100%; margin-bottom: 24px; word-break: break-word; }
    
    #mic-btn {
      width: 96px; height: 96px; border-radius: 48px;
      background: linear-gradient(135deg, #6366F1, #8B5CF6);
      border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 32px rgba(99, 102, 241, 0.5);
      transition: transform 0.15s ease;
    }
    #mic-btn.listening {
      animation: pulse 1s ease-in-out infinite;
      background: linear-gradient(135deg, #EF4444, #F59E0B);
      box-shadow: 0 8px 32px rgba(239, 68, 68, 0.5);
    }
    #mic-btn svg { width: 40px; height: 40px; fill: white; }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.15); }
    }
    #hint { font-size: 13px; color: #94a3b8; text-align: center; margin-top: 16px; line-height: 1.6; }
    #error { color: #EF4444; font-size: 14px; text-align: center; margin-top: 12px; }
  </style>
</head>
<body>
  <div id="status">Tap the microphone to start speaking</div>
  <div id="transcript">Your words will appear here...</div>
  <button id="mic-btn" onclick="toggleListening()">
    <svg viewBox="0 0 24 24"><path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 15.2 14.47 17 12 17s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V21c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/></svg>
  </button>
  <div id="hint">Try saying: <br><strong>"Blood pressure 120 over 80"</strong><br>or <strong>"Heart rate 75 bpm"</strong><br>or <strong>"Blood sugar 110"</strong></div>
  <div id="error"></div>

  <script>
    let recognition = null;
    let listening = false;
    let finalTranscript = '';

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      document.getElementById('error').textContent = '⚠️ Voice recognition not supported. Please type instead.';
      document.getElementById('mic-btn').disabled = true;
    } else {
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        listening = true;
        document.getElementById('status').textContent = '🎤 Listening...';
        document.getElementById('mic-btn').classList.add('listening');
        document.getElementById('transcript').textContent = '';
        finalTranscript = '';
      };

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i] && event.results[i][0]) {
             const t = event.results[i][0].transcript;
             if (event.results[i].isFinal) finalTranscript += t;
             else interim += t;
          }
        }
        document.getElementById('transcript').textContent = finalTranscript || interim || '...';
      };

      recognition.onend = () => {
        listening = false;
        document.getElementById('mic-btn').classList.remove('listening');
        if (finalTranscript) {
           window.parent.postMessage({ type: 'result', transcript: finalTranscript }, '*');
        } else {
          document.getElementById('status').textContent = 'Nothing heard. Tap to try again.';
        }
      };

      recognition.onerror = (event) => {
        listening = false;
        document.getElementById('mic-btn').classList.remove('listening');
        document.getElementById('status').textContent = 'Tap to try again';
        if (event.error === 'not-allowed') {
          document.getElementById('error').textContent = '🚫 Microphone permission denied. Please allow access.';
        } else {
          document.getElementById('error').textContent = 'Error: ' + event.error;
        }
      };
    }

    function toggleListening() {
      if (!recognition) return;
      if (listening) {
        recognition.stop();
      } else {
        recognition.start();
      }
    }
  </script>
</body>
</html>
`;

  if (Platform.OS === 'web') {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>🎙️ Voice Log</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.webNote}>
              Tap the mic button below. Speak naturally, e.g.:{'\n'}
              <Text style={{ fontWeight: '700', color: '#6366F1' }}>"Blood pressure 120 over 80"</Text>
            </Text>
            {/* @ts-ignore */}
            <iframe
              srcDoc={speechHTML}
              style={{ width: '100%', height: 360, border: 'none', borderRadius: 16 }}
              onLoad={(e: any) => {
                window.addEventListener('message', (ev) => {
                  if (ev.data?.type === 'result' && ev.data?.transcript) {
                    onResult(ev.data.transcript);
                  }
                });
              }}
            />
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: '#1e293b' }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: '#FFF' }]}>🎙️ Voice Log</Text>
            <TouchableOpacity 
              onPress={() => {
                 if(isRecording) toggleRecording();
                 onClose();
              }} 
              style={[styles.closeBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
              disabled={isProcessing}
            >
              <Ionicons name="close" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.nativeContainer}>
             {isProcessing ? (
                <View style={styles.processingContainer}>
                   <ActivityIndicator size="large" color="#6366F1" />
                   <Text style={styles.processingText}>Transcribing securely via AI...</Text>
                </View>
             ) : (
                <>
                  <Text style={styles.statusText}>
                    {isRecording ? "🎤 Listening... Tap to stop" : "Tap the microphone to start speaking"}
                  </Text>
                  
                  <TouchableOpacity onPress={toggleRecording} style={styles.micBtnContainer}>
                    <LinearGradient
                      colors={isRecording ? ['#EF4444', '#F59E0B'] : ['#6366F1', '#8B5CF6']}
                      style={[styles.micBtn, isRecording && styles.micBtnListening]}
                    >
                      <Ionicons name={isRecording ? "stop" : "mic"} size={40} color="white" />
                    </LinearGradient>
                  </TouchableOpacity>

                  <Text style={styles.hintText}>
                    Try saying:{'\n'}
                    <Text style={{fontWeight:'700', color:'#A5B4FC'}}>"Blood pressure 120 over 80"</Text>{'\n'}
                    or <Text style={{fontWeight:'700', color:'#A5B4FC'}}>"Heart rate 75 bpm"</Text>
                  </Text>
                </>
             )}
          </View>

          <TouchableOpacity onPress={onClose} style={styles.cancelBtn} disabled={isProcessing}>
            <Text style={[styles.cancelText, { color: 'rgba(255,255,255,0.6)' }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, backgroundColor: '#FFF' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b', letterSpacing: -0.5 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  webNote: { fontSize: 14, color: '#64748B', lineHeight: 22, marginBottom: 12 },
  cancelBtn: { alignItems: 'center', padding: 16, marginTop: 4 },
  cancelText: { fontWeight: '700', fontSize: 15, color: '#64748B' },
  
  nativeContainer: {
    height: 360,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6366F1',
    marginBottom: 40,
    textAlign: 'center',
  },
  micBtnContainer: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 40,
  },
  micBtn: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnListening: {
    shadowColor: '#EF4444',
  },
  hintText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
  },
  processingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    color: '#A5B4FC',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
  }
});
