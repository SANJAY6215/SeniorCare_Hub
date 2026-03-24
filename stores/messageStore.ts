import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useUserStore } from './userStore';

export interface ChatMessage {
  id: string;
  user_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  media_url?: string; // Stores the Storage Path (not the full URL)
  media_type?: 'image' | 'audio';
  created_at: string;
}

interface MessageState {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  channel: any;
  fetchMessages: () => Promise<void>;
  resolveSignedUrls: (msgs: ChatMessage[]) => Promise<ChatMessage[]>;
  sendMessage: (content: string, media?: { uri: string, type: 'image' | 'audio' }) => Promise<void>;
  subscribeToMessages: () => void;
  unsubscribeFromMessages: () => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  loading: false,
  error: null,
  channel: null,

  fetchMessages: async () => {
    const targetUserId = useUserStore.getState().getTargetUserId();
    if (!targetUserId) return;

    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Fetch signed URLs for any media
      const messagesWithSignedUrls = await get().resolveSignedUrls(data as ChatMessage[]);
      set({ messages: messagesWithSignedUrls, loading: false });
    } catch (e: any) {
      console.error(e);
      set({ error: e.message, loading: false });
    }
  },

  resolveSignedUrls: async (msgs: ChatMessage[]) => {
    const paths = msgs.filter(m => m.media_url && !m.media_url.startsWith('http')).map(m => m.media_url!);
    if (paths.length === 0) return msgs;

    const { data: signedData, error } = await supabase.storage
      .from('chat-media')
      .createSignedUrls(paths, 3600);
    
    if (error || !signedData) return msgs;

    const signedMap = new Map(signedData.map(d => [d.path, d.signedUrl]));
    return msgs.map(m => {
      if (m.media_url && !m.media_url.startsWith('http')) {
        return { ...m, media_url: signedMap.get(m.media_url) || m.media_url };
      }
      return m;
    });
  },

  sendMessage: async (content: string, media?: { uri: string, type: 'image' | 'audio' }) => {
    const profile = useUserStore.getState().profile;
    if (!profile) return;
    if (!content.trim() && !media) return;

    const targetUserId = useUserStore.getState().getTargetUserId();
    if (!targetUserId) throw new Error('No target user found');

    let mediaUrl = undefined;
    if (media) {
      // Upload media to Supabase Storage
      const fileExt = media.uri.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${targetUserId}/${fileName}`;

      const formData = new FormData();
      formData.append('file', {
        uri: media.uri,
        name: fileName,
        type: media.type === 'image' ? `image/${fileExt}` : `audio/${fileExt}`,
      } as any);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, formData);

      if (uploadError) throw uploadError;
      mediaUrl = filePath;
    }

    const newMsg = {
      user_id: targetUserId,
      sender_id: profile.id,
      sender_name: profile.firstName || (profile.role === 'senior' ? 'Senior' : 'Caregiver'),
      content: content.trim(),
      media_url: mediaUrl,
      media_type: media?.type,
    };

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([newMsg])
        .select()
        .single();

      if (error) throw error;
      
      // Resolve signed URL for the newly sent message
      const resolvedArr = await get().resolveSignedUrls([data as ChatMessage]);
      const resolvedMsg = resolvedArr[0];

      // Optimistically append if not already received via subscription
      set((state) => {
        if (state.messages.find(m => m.id === resolvedMsg.id)) return state;
        return { messages: [...state.messages, resolvedMsg] };
      });
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  },

  subscribeToMessages: () => {
    const { channel } = get();
    
    // Unsubscribe from any existing channel first
    if (channel) {
      supabase.removeChannel(channel);
    }
    
    const targetUserId = useUserStore.getState().getTargetUserId();
    if (!targetUserId) return;

    const newChannel = supabase
      .channel(`room_${targetUserId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `user_id=eq.${targetUserId}`
        },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          const resolvedArr = await get().resolveSignedUrls([newMsg]);
          const resolvedMsg = resolvedArr[0];

          set((state) => {
            if (state.messages.find(m => m.id === resolvedMsg.id)) return state;
            return { messages: [...state.messages, resolvedMsg] };
          });
        }
      )
      .subscribe();

    set({ channel: newChannel });
  },

  unsubscribeFromMessages: () => {
    const { channel } = get();
    if (channel) {
      supabase.removeChannel(channel);
      set({ channel: null });
    }
  }
}));
