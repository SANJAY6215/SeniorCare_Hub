import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';
import { useTextScale } from '@/hooks/useTheme';
import { useVaultStore, VaultDocument, DocumentCategory } from '@/stores/vaultStore';
import { Spacing, Radius } from '@/constants/Typography';

const categories: { id: DocumentCategory; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { id: 'insurance', label: 'Insurance', icon: 'card', color: '#6366F1' },
  { id: 'directives', label: 'Directives', icon: 'document-text', color: '#F43F5E' },
  { id: 'results', label: 'Lab Results', icon: 'flask', color: '#10B981' },
  { id: 'other', label: 'Other', icon: 'folder', color: '#64748B' },
];

export default function MedicalVaultScreen() {
  const { colors } = useTheme();
  const scale = useTextScale();
  const router = useRouter();
  const { documents, deleteDocument, toggleShare, addDocument } = useVaultStore();
  const [filter, setFilter] = useState<DocumentCategory | 'all'>('all');

  const filteredDocs = filter === 'all' ? documents : documents.filter(d => d.category === filter);

  const handleUpload = () => {
    Alert.alert('Upload Document', 'In this production version, you would select a file from your device. For now, we will add a sample Lab Result.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Add Sample', onPress: () => {
        addDocument({
          name: `Lab Result ${new Date().toLocaleDateString()}.pdf`,
          category: 'results',
          fileSize: '1.4 MB',
          isShared: true,
          mimeType: 'application/pdf',
        });
      }},
    ]);
  };

  const handleDocAction = (doc: VaultDocument) => {
    Alert.alert(doc.name, 'Choose an action', [
      { text: 'View', onPress: () => Alert.alert('Viewing Document', 'The document viewer would open here.') },
      { text: doc.isShared ? 'Stop Sharing' : 'Share with Caregiver', onPress: () => toggleShare(doc.id) },
      { text: 'Delete', style: 'destructive', onPress: () => deleteDocument(doc.id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Medical Vault', headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text, fontSize: 24 * scale }]}>Medical Vault</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Encrypted Document Storage</Text>
        </View>
        <TouchableOpacity onPress={handleUpload} style={[styles.uploadBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="cloud-upload" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Hero Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{documents.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Documents</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statNum, { color: colors.success }]}>{documents.filter(d => d.isShared).length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Shared</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Encrypted</Text>
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: Spacing.sm }}>
        <TouchableOpacity 
          onPress={() => setFilter('all')}
          style={[styles.filterChip, { backgroundColor: filter === 'all' ? colors.primary : colors.surface, borderColor: filter === 'all' ? colors.primary : colors.border }]}
        >
          <Text style={{ color: filter === 'all' ? '#FFF' : colors.text, fontWeight: '700' }}>All</Text>
        </TouchableOpacity>
        {categories.map(cat => (
          <TouchableOpacity 
            key={cat.id} 
            onPress={() => setFilter(cat.id)}
            style={[styles.filterChip, { backgroundColor: filter === cat.id ? colors.primary : colors.surface, borderColor: filter === cat.id ? colors.primary : colors.border }]}
          >
            <Ionicons name={cat.icon} size={14} color={filter === cat.id ? '#FFF' : cat.color} />
            <Text style={{ color: filter === cat.id ? '#FFF' : colors.text, fontWeight: '700' }}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content}>
        {filteredDocs.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="folder-open-outline" size={48} color={colors.textMuted} />
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 12 }}>No documents found in this category.</Text>
          </View>
        ) : (
          filteredDocs.map((doc, i) => (
            <Animated.View key={doc.id} entering={FadeInDown.delay(i * 100).springify()} layout={Layout.springify()}>
              <TouchableOpacity
                onPress={() => handleDocAction(doc)}
                style={[styles.docCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={[styles.docIcon, { backgroundColor: categories.find(c => c.id === doc.category)?.color + '15' }]}>
                  <Ionicons name={categories.find(c => c.id === doc.category)?.icon as any} size={24} color={categories.find(c => c.id === doc.category)?.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.docName, { color: colors.text }]} numberOfLines={1}>{doc.name}</Text>
                  <Text style={[styles.docMeta, { color: colors.textSecondary }]}>{new Date(doc.uploadDate).toLocaleDateString()} · {doc.fileSize}</Text>
                </View>
                {doc.isShared && (
                  <View style={[styles.sharedBadge, { backgroundColor: colors.success + '15' }]}>
                    <Ionicons name="people" size={12} color={colors.success} />
                    <Text style={[styles.sharedText, { color: colors.success }]}>Shared</Text>
                  </View>
                )}
                <Ionicons name="ellipsis-vertical" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </Animated.View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xl, gap: Spacing.md },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title: { fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, fontWeight: '600', opacity: 0.6 },
  uploadBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  statCard: { flex: 1, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  statNum: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  filterRow: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg, maxHeight: 44 },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, gap: 6 },
  content: { padding: Spacing.lg },
  emptyBox: { padding: 40, borderRadius: Radius.xl, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center' },
  docCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderRadius: Radius.xl, borderWidth: 1, marginBottom: Spacing.md, gap: Spacing.md },
  docIcon: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  docName: { fontSize: 15, fontWeight: '700' },
  docMeta: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  sharedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  sharedText: { fontSize: 10, fontWeight: '800' },
});
