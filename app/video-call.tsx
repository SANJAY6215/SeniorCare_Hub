import React from 'react';
import { SafeAreaView } from 'react-native';
import VideoCallRoom from '@/components/VideoCallRoom';
import { useRouter } from 'expo-router';

/**
 * /video-call route — now renders the real Jitsi Meet room.
 * Room name is auto-derived from family code in VideoCallRoom component.
 */
export default function VideoCallScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <VideoCallRoom onClose={() => router.back()} />
    </SafeAreaView>
  );
}
