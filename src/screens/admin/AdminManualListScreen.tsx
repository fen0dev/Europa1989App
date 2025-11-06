import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  getAllManualsAdmin,
  deleteManual,
  toggleManualPublish,
} from '../../api/admin';
import { colors, radius, spacing } from '../../theme/tokens';
import { useToast } from '../notification/toast/Toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import type { AdminStackParamList } from '../../navigation/admin/AdminStack';

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

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminManualList'>;

export default function AdminManualListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const topPad = Math.max(headerHeight, insets.top) + 15;
  const toast = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');

  const { data: manuals, isLoading, refetch } = useQuery({
    queryKey: ['admin-manuals'],
    queryFn: getAllManualsAdmin,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteManual,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-manuals'] });
      toast.showToast('Manual deleted', 'success');
    },
    onError: (error: any) => {
      toast.showToast(error.message || 'Error deleting manual', 'error');
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ manualId, published }: { manualId: string; published: boolean }) =>
      toggleManualPublish(manualId, published),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-manuals'] });
      toast.showToast(
        variables.published ? 'Manual published' : 'Manual hidden',
        'success'
      );
    },
  });

  const adminManuals = (manuals ?? []) as AdminManual[];
  const filteredManuals = adminManuals.filter((manual) => {
    if (filter === 'published') return manual.published;
    if (filter === 'draft') return !manual.published;
    return true;
  });

  const handleDelete = (manualId: string, title: string) => {
    Alert.alert(
      'Delete Manual',
      `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(manualId),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.filters, { paddingTop: topPad }]}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'published' && styles.filterButtonActive]}
          onPress={() => setFilter('published')}
        >
          <Text style={[styles.filterText, filter === 'published' && styles.filterTextActive]}>
            Published
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'draft' && styles.filterButtonActive]}
          onPress={() => setFilter('draft')}
        >
          <Text style={[styles.filterText, filter === 'draft' && styles.filterTextActive]}>
            Drafts
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredManuals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            tintColor="#fff"
            refreshing={isLoading}
            onRefresh={refetch}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyText}>No manuals found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('AdminManualEdit', { manualId: item.id })}
          >
            <View style={styles.cardContent}>
              {item.cover_url ? (
                <Image source={{ uri: item.cover_url }} style={styles.cover} />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <Ionicons name="document-text-outline" size={32} color="rgba(255,255,255,0.5)" />
                </View>
              )}
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <View style={styles.cardMeta}>
                  <View style={[styles.statusBadge, item.published ? styles.statusPublished : styles.statusDraft]}>
                    <Text style={styles.statusText}>
                      {item.published ? 'Published' : 'Draft'}
                    </Text>
                  </View>
                  <Text style={styles.versionText}>v{item.manual_version || 1}</Text>
                </View>
              </View>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() =>
                  togglePublishMutation.mutate({
                    manualId: item.id,
                    published: !item.published,
                  })
                }
              >
                <Ionicons
                  name={item.published ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#4FFFBF"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDelete(item.id, item.title)}
              >
                <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AdminManualEdit', {})}
      >
        <Ionicons name="add" size={28} color="#0b0f14" />
      </TouchableOpacity>
    </View>
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
  filters: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(79, 255, 191, 0.15)',
    borderColor: '#4FFFBF',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  filterTextActive: {
    color: '#4FFFBF',
  },
  list: {
    padding: spacing.xl,
    paddingTop: spacing.md,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  cover: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    marginRight: spacing.md,
  },
  coverPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.fg,
    marginBottom: spacing.xs,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPublished: {
    backgroundColor: 'rgba(79, 255, 191, 0.15)',
  },
  statusDraft: {
    backgroundColor: 'rgba(255, 209, 102, 0.15)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.fg,
  },
  versionText: {
    fontSize: 12,
    color: 'rgba(232,238,247,0.5)',
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl + 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4FFFBF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#4FFFBF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl * 2,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: 'rgba(232,238,247,0.5)',
  },
});