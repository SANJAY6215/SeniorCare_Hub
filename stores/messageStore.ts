import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useUserStore } from './userStore';

export interface ChatMessage {
  id: string;
  user_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

interface MessageState {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  channel: any;
  fetchMessages: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  subscribeToMessages: () => void;
  unsubscribeFromMessages: () => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  loading: false,
  error: null,
  channel: null,

  fetchMessages: async () => {
    const profile = useUserStore.getState().profile;
    if (!profile) return;
    const targetUserId = profile.role === 'senior' ? profile.id : profile.linkedSeniorId;
    if (!targetUserId) return;

    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      set({ messages: data as ChatMessage[], loading: false });
    } catch (e: any) {
      console.error(e);
      set({ error: e.message, loading: false });
    }
  },

  sendMessage: async (content: string) => {
    const profile = useUserStore.getState().profile;
    if (!profile || !content.trim()) return;

    const targetUserId = profile.role === 'senior' ? profile.id : profile.linkedSeniorId;
    if (!targetUserId) throw new Error('No target user found');

    const newMsg = {
      user_id: targetUserId,
      sender_id: profile.id,
      sender_name: profile.firstName || (profile.role === 'senior' ? 'Senior' : 'Caregiver'),
      content: content.trim(),
    };

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([newMsg])
        .select()
        .single();

      if (error) throw error;
      
      // Optimistically append if not already received via subscription
      set((state) => {
        if (state.messages.find(m => m.id === data.id)) return state;
        return { messages: [...state.messages, data as ChatMessage] };
      });
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  },

  subscribeToMessages: () => {
    const profile = useUserStore.getState().profile;
    const { channel } = get();
    
    // Unsubscribe from any existing channel first
    if (channel) {
      supabase.removeChannel(channel);
    }

    if (!profile) return;
    const targetUserId = profile.role === 'senior' ? profile.id : profile.linkedSeniorId;
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
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          set((state) => {
            if (state.messages.find(m => m.id === newMsg.id)) return state;
            return { messages: [...state.messages, newMsg] };
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
