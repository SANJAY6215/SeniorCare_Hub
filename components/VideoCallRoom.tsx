import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUserStore } from '@/stores/userStore';

/**
 * VideoCallRoom — embeds a live Jitsi Meet room.
 * The room name is derived from the user's family code so the
 * Senior and linked Caregiver always join the same room automatically.
 */
export default function VideoCallRoom({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const webviewRef = useRef<WebView>(null);
  const { profile } = useUserStore();

  // Build a stable, unique room name from the family code (or user ID as fallback)
  const familyCode = profile?.familyCode || profile?.linkedSeniorId?.slice(0, 8) || 'seniorcare-default';
  const roomName = `SeniorCareHub-${familyCode}`;
  const displayName = profile?.firstName ? `${profile.firstName} ${profile.lastName}` : 'SeniorCare User';

  // Jitsi Meet IFrame API loads the room
  const jitsiHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; height: 100vh; width: 100vw; overflow: hidden; }
    #jitsi-container { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="jitsi-container"></div>
  <script src="https://meet.jit.si/external_api.js"></script>
  <script>
    const api = new JitsiMeetExternalAPI('meet.jit.si', {
      roomName: '${roomName}',
      parentNode: document.querySelector('#jitsi-container'),
      userInfo: {
        displayName: '${displayName}',
      },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        disableDeepLinking: true,
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: ['microphone', 'camera', 'hangup', 'chat', 'fullscreen'],
        SHOW_JITSI_WATERMARK: false,
        SHOW_BRAND_WATERMARK: false,
        SHOW_POWERED_BY: false,
      },
    });

    api.addEventListeners({
      readyToClose: () => {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'callEnded' }));
      },
    });
  </script>
</body>
</html>
`;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'callEnded') {
        onClose ? onClose() : router.back();
      }
    } catch {}
  };

  // On web platform, open in new tab (WebView not available in Expo web)
  if (Platform.OS === 'web') {
    const jitsiUrl = `https://meet.jit.si/${roomName}`;
    return (
      <SafeAreaView style={styles.webFallback}>
        <View style={styles.webContent}>
          <Ionicons name="videocam" size={64} color="#6366F1" />
          <Text style={styles.webTitle}>Video Call Ready</Text>
          <Text style={styles.webSub}>Your room: <Text style={{ fontWeight: '800' }}>{roomName}</Text></Text>
          <Text style={styles.webInstructions}>
            Tap the button below to open the call. Share the room name above with your family member so they can join.
          </Text>
          <TouchableOpacity
            style={styles.webJoinBtn}
            onPress={() => { if (typeof window !== 'undefined') window.open(jitsiUrl, '_blank'); }}
          >
            <Ionicons name="videocam" size={22} color="#FFF" />
            <Text style={styles.webJoinBtnText}>Open Video Room</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onClose ? onClose() : router.back()} style={styles.webCloseBtn}>
            <Text style={styles.webCloseBtnText}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <WebView
        ref={webviewRef}
        source={{ html: jitsiHTML }}
        style={{ flex: 1 }}
        onMessage={handleMessage}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
      />
      {/* Emergency back button in case Jitsi controls fail */}
      <TouchableOpacity
        onPress={() => onClose ? onClose() : router.back()}
        style={styles.emergencyBack}
      >
        <Ionicons name="close-circle" size={36} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  emergencyBack: { position: 'absolute', top: 50, right: 16, zIndex: 999 },
  webFallback: { flex: 1, backgroundColor: '#0F172A' },
  webContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  webTitle: { fontSize: 28, fontWeight: '900', color: '#FFF', letterSpacing: -0.5, marginTop: 12 },
  webSub: { fontSize: 15, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  webInstructions: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 22, marginTop: 4 },
  webJoinBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#6366F1', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 50, marginTop: 16, elevation: 8, shadowColor: '#6366F1', shadowOpacity: 0.5, shadowRadius: 12 },
  webJoinBtnText: { color: '#FFF', fontWeight: '800', fontSize: 17 },
  webCloseBtn: { marginTop: 8, padding: 12 },
  webCloseBtnText: { color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: 14 },
});
