import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  createSection,
  updateSection,
  deleteSection,
} from '../../api/admin';
import { getSection, getSections } from '../../api/manuals';
import { colors, radius, spacing } from '../../theme/tokens';
import type { AdminStackParamList } from '../../navigation/admin/AdminStack';
import { useToast } from '../notification/toast/Toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminSectionEdit'>;

export default function AdminSectionEditScreen({ route, navigation }: Props) {
  const { sectionId, manualId } = route.params;
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const topPad = Math.max(headerHeight, insets.top) + 15;
  const toast = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [orderIndex, setOrderIndex] = useState(0);

  const { data: section, isLoading: loadingSection } = useQuery({
    queryKey: ['section', sectionId],
    queryFn: () => getSection(sectionId!),
    enabled: !!sectionId,
  });

  const { data: sections } = useQuery({
    queryKey: ['sections', manualId],
    queryFn: () => getSections(manualId),
  });

  useEffect(() => {
    if (section) {
      setTitle(section.title);
      setOrderIndex(section.order_index);
    } else if (sections && sections.length > 0) {
      // Se è una nuova sezione, imposta l'order_index al prossimo disponibile
      const maxOrder = Math.max(...sections.map(s => s.order_index), 0);
      setOrderIndex(maxOrder + 1);
    }
  }, [section, sections]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (sectionId) {
        return updateSection(sectionId, { title, order_index: orderIndex });
      } else {
        return createSection({ manual_id: manualId, title, order_index: orderIndex });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', manualId] });
      toast.showToast(
        sectionId ? 'Section updated' : 'Section created',
        'success'
      );
      navigation.goBack();
    },
    onError: (error: any) => {
      toast.showToast(error.message || 'Error saving', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteSection(sectionId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', manualId] });
      toast.showToast('Section deleted', 'success');
      navigation.goBack();
    },
    onError: (error: any) => {
      toast.showToast(error.message || 'Error deleting', 'error');
    },
  });

  const handleDelete = () => {
    Alert.alert(
      'Delete Section',
      `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  if (loadingSection) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: topPad }]}>
      <View style={styles.section}>
        <Text style={styles.label}>Section Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Section title"
          placeholderTextColor="rgba(255,255,255,0.4)"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Order</Text>
        <TextInput
          style={styles.input}
          value={orderIndex.toString()}
          onChangeText={(text) => {
            const num = parseInt(text, 10);
            if (!isNaN(num)) setOrderIndex(num);
          }}
          keyboardType="numeric"
          placeholder="Display order"
          placeholderTextColor="rgba(255,255,255,0.4)"
        />
        <Text style={styles.hint}>
          Sections are ordered by this number (lower = first)
        </Text>
      </View>

      <View style={styles.actions}>
        {sectionId && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <ActivityIndicator color="#FF6B6B" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                <Text style={styles.deleteButtonText}>Delete Section</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.saveButton, (!title.trim() || saveMutation.isPending) && styles.saveButtonDisabled]}
          onPress={() => saveMutation.mutate()}
          disabled={!title.trim() || saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator color="#0b0f14" />
          ) : (
            <Text style={styles.saveButtonText}>
              {sectionId ? 'Save Changes' : 'Create Section'}
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
  hint: {
    fontSize: 12,
    color: 'rgba(232,238,247,0.5)',
    marginTop: spacing.xs,
  },
  actions: {
    marginBottom: spacing.xl,
    gap: spacing.md,
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    gap: spacing.sm,
  },
  deleteButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
});