import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  createManual,
  updateManual,
  getManualAdminStats,
  toggleManualPublish,
  incrementManualVersion,
  uploadManualCover,
  uploadManualPDF,
  getAllManualsAdmin,
} from '../../api/admin';
import { getManual } from '../../api/manuals';
import { colors, radius, spacing } from '../../theme/tokens';
import type { AdminStackParamList } from '../../navigation/admin/AdminStack';
import { useToast } from '../notification/toast/Toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';

type AdminManual = {
  id: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  updated_at: string;
  manual_version?: number;
  pdf_path?: string | null;
  pdf_url?: string | null;
  published?: boolean;
};

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminManualEdit'>;

export default function AdminManualEditScreen({ route, navigation }: Props) {
  const { manualId } = route.params || {};
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const topPad = Math.max(headerHeight, insets.top) + 15;
  const toast = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [published, setPublished] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [pdfPath, setPdfPath] = useState<string | null>(null);

  // Usa getAllManualsAdmin per ottenere anche published quando si modifica un manuale esistente
  const { data: allManuals } = useQuery({
    queryKey: ['admin-manuals'],
    queryFn: getAllManualsAdmin,
    enabled: !!manualId,
  });

  const { data: manual, isLoading: loadingManual } = useQuery({
    queryKey: ['manual', manualId],
    queryFn: () => getManual(manualId!),
    enabled: !!manualId,
  });

  const { data: stats } = useQuery({
    queryKey: ['manual-stats', manualId],
    queryFn: () => getManualAdminStats(manualId!),
    enabled: !!manualId,
  });

  useEffect(() => {
    if (manualId && allManuals) {
      // Trova il manuale nella lista admin che include published
      const adminManual = allManuals.find(m => m.id === manualId) as AdminManual | undefined;
      if (adminManual) {
        setTitle(adminManual.title);
        setDescription(adminManual.description || '');
        setPublished(adminManual.published ?? false);
        setCoverUrl(adminManual.cover_url || null);
        setPdfPath(adminManual.pdf_path || null);
      }
    } else if (manual) {
      // Fallback se non trovato nella lista admin
      setTitle(manual.title);
      setDescription(manual.description || '');
      setCoverUrl(manual.cover_url || null);
      setPdfPath(manual.pdf_path || null);
    }
  }, [manual, allManuals, manualId]);

  const uploadCoverMutation = useMutation({
    mutationFn: uploadManualCover,
    onSuccess: (url) => {
      setCoverUrl(url);
      toast.showToast('Cover uploaded successfully', 'success');
    },
    onError: (error: any) => {
      toast.showToast(error.message || 'Error uploading cover', 'error');
    },
  });

  const uploadPDFMutation = useMutation({
    mutationFn: uploadManualPDF,
    onSuccess: (path) => {
      setPdfPath(path);
      toast.showToast('PDF uploaded successfully', 'success');
    },
    onError: (error: any) => {
      toast.showToast(error.message || 'Error uploading PDF', 'error');
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (manualId) {
        return updateManual(manualId, {
          title,
          description,
          published,
          cover_url: coverUrl,
          pdf_path: pdfPath,
        });
      } else {
        return createManual({
          title,
          description,
          published,
          cover_url: coverUrl ?? undefined,
          pdf_path: pdfPath ?? undefined,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-manuals'] });
      toast.showToast(
        manualId ? 'Manual updated' : 'Manual created',
        'success'
      );
      navigation.goBack();
    },
    onError: (error: any) => {
      toast.showToast(error.message || 'Error saving', 'error');
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: () => toggleManualPublish(manualId!, !published),
    onSuccess: () => {
      setPublished(!published);
      queryClient.invalidateQueries({ queryKey: ['admin-manuals'] });
      toast.showToast(
        published ? 'Manual hidden' : 'Manual published',
        'success'
      );
    },
  });

  const incrementVersionMutation = useMutation({
    mutationFn: () => incrementManualVersion(manualId!),
    onSuccess: (newVersion) => {
      queryClient.invalidateQueries({ queryKey: ['manual', manualId] });
      toast.showToast(`Version incremented to ${newVersion}`, 'success');
    },
  });

  if (loadingManual) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: topPad }]}>
      <View style={styles.section}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Manual title"
          placeholderTextColor="rgba(255,255,255,0.4)"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Manual description"
          placeholderTextColor="rgba(255,255,255,0.4)"
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Cover Image</Text>
        {coverUrl ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: coverUrl }} style={styles.coverImage} />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => setCoverUrl(null)}
            >
              <Ionicons name="close-circle" size={24} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        ) : null}
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => uploadCoverMutation.mutate()}
          disabled={uploadCoverMutation.isPending}
        >
          {uploadCoverMutation.isPending ? (
            <ActivityIndicator color="#4FFFBF" />
          ) : (
            <>
              <Ionicons name="image-outline" size={20} color="#4FFFBF" />
              <Text style={styles.uploadButtonText}>Upload Cover</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Manual PDF</Text>
        {pdfPath ? (
          <View style={styles.pdfContainer}>
            <Ionicons name="document-text" size={24} color="#4FFFBF" />
            <Text style={styles.pdfText} numberOfLines={1}>
              {pdfPath.split('/').pop()}
            </Text>
            <TouchableOpacity
              style={styles.removePdfButton}
              onPress={() => setPdfPath(null)}
            >
              <Ionicons name="close-circle" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        ) : null}
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => uploadPDFMutation.mutate()}
          disabled={uploadPDFMutation.isPending}
        >
          {uploadPDFMutation.isPending ? (
            <ActivityIndicator color="#4FFFBF" />
          ) : (
            <>
              <Ionicons name="document-outline" size={20} color="#4FFFBF" />
              <Text style={styles.uploadButtonText}>Upload PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {manualId && stats && (
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.total_section}</Text>
              <Text style={styles.statLabel}>Sections</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.total_articles}</Text>
              <Text style={styles.statLabel}>Articles</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.total_questions}</Text>
              <Text style={styles.statLabel}>Questions</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.total_completions}</Text>
              <Text style={styles.statLabel}>Completions</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Published</Text>
          <Switch
            value={published}
            onValueChange={(value) => {
              if (manualId) {
                togglePublishMutation.mutate();
              } else {
                setPublished(value);
              }
            }}
            trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#4FFFBF' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {manualId && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.versionButton}
            onPress={() => {
              Alert.alert(
                'Increment Version',
                'Do you want to increment the manual version? This will invalidate all existing completions.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Confirm',
                    onPress: () => incrementVersionMutation.mutate(),
                  },
                ]
              );
            }}
          >
            <Text style={styles.versionButtonText}>
              Increment Version (v{manual?.manual_version || 1})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.saveButton, (!title.trim() || saveMutation.isPending) && styles.saveButtonDisabled]}
          onPress={() => saveMutation.mutate()}
          disabled={!title.trim() || saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator color="#0b0f14" />
          ) : (
            <Text style={styles.saveButtonText}>
              {manualId ? 'Save Changes' : 'Create Manual'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.fg,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.fg,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.fg,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(79, 255, 191, 0.1)',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#4FFFBF',
    gap: spacing.sm,
  },
  uploadButtonText: {
    color: '#4FFFBF',
    fontSize: 14,
    fontWeight: '600',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: spacing.md,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
  },
  pdfContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 255, 191, 0.1)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  pdfText: {
    flex: 1,
    color: colors.fg,
    fontSize: 14,
  },
  removePdfButton: {
    padding: 4,
  },
  statsSection: {
    marginBottom: spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4FFFBF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(232,238,247,0.6)',
  },
  versionButton: {
    backgroundColor: 'rgba(79, 255, 191, 0.1)',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#4FFFBF',
  },
  versionButtonText: {
    color: '#4FFFBF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  actions: {
    marginBottom: spacing.xl,
  },
  saveButton: {
    backgroundColor: '#4FFFBF',
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#0b0f14',
    fontSize: 16,
    fontWeight: '700',
  },
});
