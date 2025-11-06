import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  getAllNotesAdmin,
  deleteNoteAdmin,
  toggleNotePin,
} from '../../api/admin';
import { colors, radius, spacing } from '../../theme/tokens';
import type { AdminStackParamList } from '../../navigation/admin/AdminStack';
import { useToast } from '../notification/toast/Toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import type { ManualNote } from '../../api/notes';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminNotesModeration'>;

export default function AdminNotesModerationScreen({ route, navigation }: Props) {
  const { manualId } = route.params;
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const topPad = Math.max(headerHeight, insets.top) + 15;
  const toast = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all');

  const { data: notes, isLoading, refetch } = useQuery({
    queryKey: ['admin-notes', manualId],
    queryFn: () => getAllNotesAdmin(manualId),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNoteAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notes', manualId] });
      toast.showToast('Note deleted', 'success');
    },
    onError: (error: any) => {
      toast.showToast(error.message || 'Error deleting', 'error');
    },
  });

  const pinMutation = useMutation({
    mutationFn: ({ noteId, pinned }: { noteId: string; pinned: boolean }) =>
      toggleNotePin(noteId, pinned),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-notes', manualId] });
      toast.showToast(
        variables.pinned ? 'Note pinned' : 'Note unpinned',
        'success'
      );
    },
  });

  const filteredNotes = notes?.filter((note) => {
    if (filter === 'public') return note.is_public;
    if (filter === 'private') return !note.is_public;
    return true;
  });

  const handleDelete = (noteId: string, content: string) => {
    Alert.alert(
      'Delete Note',
      `Are you sure you want to delete this note?\n\n"${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(noteId),
        },
      ]
    );
  };

  const getNoteTypeColor = (type: string) => {
    switch (type) {
      case 'tip':
        return '#4FFFBF';
      case 'warn':
        return '#FFD166';
      case 'ask':
        return '#8AE2FF';
      case 'clarify':
        return '#FF85F3';
      default:
        return '#fff';
    }
  };

  const getNoteTypeIcon = (type: string) => {
    switch (type) {
      case 'tip':
        return 'bulb-outline';
      case 'warn':
        return 'warning-outline';
      case 'ask':
        return 'help-circle-outline';
      case 'clarify':
        return 'chatbubble-outline';
      default:
        return 'document-text-outline';
    }
  };

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
          style={[styles.filterButton, filter === 'public' && styles.filterButtonActive]}
          onPress={() => setFilter('public')}
        >
          <Text style={[styles.filterText, filter === 'public' && styles.filterTextActive]}>
            Public
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'private' && styles.filterButtonActive]}
          onPress={() => setFilter('private')}
        >
          <Text style={[styles.filterText, filter === 'private' && styles.filterTextActive]}>
            Private
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredNotes}
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
            <Text style={styles.emptyText}>No notes found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            onDelete={() => handleDelete(item.id, item.content)}
            onPin={() => pinMutation.mutate({ noteId: item.id, pinned: !item.is_pinned })}
            getNoteTypeColor={getNoteTypeColor}
            getNoteTypeIcon={getNoteTypeIcon}
          />
        )}
      />
    </View>
  );
}

function NoteCard({
  note,
  onDelete,
  onPin,
  getNoteTypeColor,
  getNoteTypeIcon,
}: {
  note: ManualNote;
  onDelete: () => void;
  onPin: () => void;
  getNoteTypeColor: (type: string) => string;
  getNoteTypeIcon: (type: string) => string;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.typeBadge, { backgroundColor: `${getNoteTypeColor(note.note_type)}20` }]}>
            <Ionicons
              name={getNoteTypeIcon(note.note_type) as any}
              size={16}
              color={getNoteTypeColor(note.note_type)}
            />
            <Text style={[styles.typeText, { color: getNoteTypeColor(note.note_type) }]}>
              {note.note_type}
            </Text>
          </View>
          {note.is_pinned && (
            <Ionicons name="pin" size={16} color="#4FFFBF" />
          )}
          {!note.is_public && (
            <View style={styles.privateBadge}>
              <Text style={styles.privateText}>Private</Text>
            </View>
          )}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={onPin} style={styles.actionButton}>
            <Ionicons
              name={note.is_pinned ? 'pin' : 'pin-outline'}
              size={20}
              color="#4FFFBF"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
            <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.noteContent}>{note.content}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.authorText}>
          {note.display_name || note.nickname || 'Anonymous user'}
        </Text>
        <View style={styles.stats}>
          {note.helpful_content > 0 && (
            <View style={styles.stat}>
              <Ionicons name="heart" size={14} color="#FF6B6B" />
              <Text style={styles.statText}>{note.helpful_content}</Text>
            </View>
          )}
          {note.like_count > 0 && (
            <View style={styles.stat}>
              <Ionicons name="thumbs-up-outline" size={14} color="#4FFFBF" />
              <Text style={styles.statText}>{note.like_count}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    gap: 4,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  privateBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 209, 102, 0.15)',
  },
  privateText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFD166',
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.xs,
  },
  noteContent: {
    fontSize: 14,
    color: colors.fg,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  authorText: {
    fontSize: 12,
    color: 'rgba(232,238,247,0.6)',
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: 'rgba(232,238,247,0.6)',
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