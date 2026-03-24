import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';
import { Alert } from 'react-native';

export type DocumentCategory = 'insurance' | 'directives' | 'results' | 'other';

export interface VaultDocument {
  id: string;
  name: string;
  category: DocumentCategory;
  uploadDate: string;
  fileSize: string;
  isShared: boolean;
  mimeType: string;
}

interface VaultStore {
  documents: VaultDocument[];
  loading: boolean;
  
  fetchDocuments: () => Promise<void>;
  addDocument: (doc: Omit<VaultDocument, 'id' | 'uploadDate'>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  toggleShare: (id: string) => Promise<void>;
}

export const useVaultStore = create<VaultStore>((set, get) => ({
  documents: [
    // Mock initial documents for demo
    { id: '1', name: 'Health Insurance Card.pdf', category: 'insurance', uploadDate: '2024-03-20T10:00:00Z', fileSize: '1.2 MB', isShared: true, mimeType: 'application/pdf' },
    { id: '2', name: 'Living Will - Final.pdf', category: 'directives', uploadDate: '2024-02-15T14:30:00Z', fileSize: '0.8 MB', isShared: false, mimeType: 'application/pdf' },
    { id: '3', name: 'Blood Test Results (Jan).jpg', category: 'results', uploadDate: '2024-01-22T09:15:00Z', fileSize: '2.4 MB', isShared: true, mimeType: 'image/jpeg' },
  ],
  loading: false,

  fetchDocuments: async () => {
    set({ loading: true });
    // Simulate API delay
    await new Promise(r => setTimeout(r, 800));
    set({ loading: false });
  },

  addDocument: async (doc) => {
    const newDoc: VaultDocument = {
      ...doc,
      id: Math.random().toString(36).substr(2, 9),
      uploadDate: new Date().toISOString(),
    };

    set(state => ({ documents: [newDoc, ...state.documents] }));
    
    // Security Audit Log
    const targetUserId = useUserStore.getState().getTargetUserId();
    await supabase.rpc('log_security_event', {
      event_name: 'DOCUMENT_UPLOADED',
      details: `User uploaded a ${doc.category} document: ${doc.name}.`,
      user_id: targetUserId,
      severity_level: 'info'
    });
  },

  deleteDocument: async (id) => {
    set(state => ({ documents: state.documents.filter(d => d.id !== id) }));
  },

  toggleShare: async (id) => {
    set(state => ({
      documents: state.documents.map(d => 
        d.id === id ? { ...d, isShared: !d.isShared } : d
      )
    }));
    
    const doc = get().documents.find(d => d.id === id);
    if (doc) {
      const targetUserId = useUserStore.getState().getTargetUserId();
      await supabase.rpc('log_security_event', {
        event_name: 'DOCUMENT_SHARE_TOGGLE',
        details: `User ${doc.isShared ? 'enabled' : 'disabled'} sharing for document: ${doc.name}.`,
        user_id: targetUserId,
        severity_level: 'warning'
      });
    }
  }
}));
