import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'react-native';
import { colors, radius, spacing, shadow } from '../../theme/tokens';
import { ManualNote, NoteType } from '../../api/notes';
import { useToast } from '../../screens/notification/toast/Toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toggleNoteReaction } from '../../api/notes';
import * as Haptics from 'expo-haptics';

type NoteCardProps = {
    note: ManualNote;
    onPress?: () => void;
    onDelete?: () => void;
    showDelete?: boolean;
};

const NOTE_TYPE_CONFIG: Record<NoteType, { icon: string; color: string; label: string; }> = {
    tip: { icon: 'bulb-outline', color: '#4CAF50', label: 'Tip' },
    warn: { icon: 'warning-outline', color: '#FFC107', label: 'Warn' },
    ask: { icon: 'help-circle-outline', color: '#9C27B0', label: 'Ask' },
    clarify: { icon: 'chatbubble-ellipses-outline', color: '#2196F3', label: 'Clarify' },
};

export function NoteCard({ note, onPress, onDelete, showDelete = false }: NoteCardProps) {
    const toast = useToast();
    const queryClient = useQueryClient();

    const config = NOTE_TYPE_CONFIG[note.note_type];

    const { mutate: handleReact } = useMutation({
        mutationFn: () => toggleNoteReaction(note.id, 'helpful'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['manual-notes', note.manual_id] });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
        onError: (err: any) => {
            toast.showToast('Failed to react. Please try again.', 'error');
            if (__DEV__) console.error(err);
        },
    });

    const authorName = note.nickname || note.display_name || 'Unknown';
    const avatarUrl = note.avatar_url || undefined;

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.card,
                note.is_pinned && styles.cardPinned,
                pressed && { opacity: 0.95 },
            ]}
            accessibilityLabel={`Note: ${note.content.substring(0, 50)}...`}
        >
            <View style={styles.cardInner}>
                <View style={styles.header}>
                    <View style={styles.typeBadge}>
                        <LinearGradient
                            colors={[`${config.color}40`, `${config.color}15`]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.typeBadgeInner}
                        >
                            <Ionicons name={config.icon as any} size={16} color={config.color} />
                            <Text style={[styles.typeLabel, { color: config.color }]}>{config.label}</Text>
                        </LinearGradient>
                    </View>

                    {note.is_pinned && (
                        <Ionicons name="pin" size={14} color="rgba(255,255,255,0.6)" />
                    )}

                    {showDelete && (
                        <Pressable
                            onPress={(e) => {
                                e.stopPropagation();
                                onDelete?.();
                            }}
                            style={styles.deleteBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10}}
                        >
                            <Ionicons name="trash-outline" size={16} color={colors.error} />
                        </Pressable>
                    )}
                </View>

                <Text style={styles.content}>{note.content}</Text>

                <View style={styles.footer}>
                    <View style={styles.authorRow}>
                        {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Ionicons name="person" size={14} color="rgba(255,255,255,0.6)" />
                          </View>
                        )}
                        <Text style={styles.authorName}>{authorName}</Text>
                        <Text style={styles.timestamp}>{formatTimestamp(note.created_at)}</Text>
                    </View>

                    <Pressable
                        onPress={(e) => {
                            e.stopPropagation();
                            handleReact();
                        }}
                        style={({ pressed }) => [
                            styles.reactionBtn,
                            note.current_user_reacted_helpful && styles.reactionBtnActive,
                            pressed && { opacity:0.8 },
                        ]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons
                            name={note.current_user_reacted_helpful ? 'heart' : 'heart-outline'}
                            size={16}
                            color={note.current_user_reacted_helpful ? '#FF6B6B' : 'rgba(255,255,255,0.6)'}
                        />
                        {note.helpful_content > 0 && (
                            <Text style={styles.reactionCount}>{note.helpful_content}</Text>
                        )}
                    </Pressable>
                </View>
            </View>
        </Pressable>
    );
}

function formatTimestamp(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just Now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
}

const BORDER = 'rgba(255,255,255,0.12)';

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadow.ios,
    ...shadow.android,
  },
  cardPinned: {
    borderColor: 'rgba(255, 193, 7, 0.4)',
    backgroundColor: 'rgba(255, 193, 7, 0.08)',
  },
  cardInner: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  typeBadge: {
    flex: 1,
  },
  typeBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radius.lg,
    alignSelf: 'flex-start',
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deleteBtn: {
    padding: spacing.xs,
  },
  content: {
    color: colors.fg,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  avatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  authorName: {
    color: 'rgba(232,238,247,0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
  timestamp: {
    color: 'rgba(232,238,247,0.5)',
    fontSize: 11,
  },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  reactionBtnActive: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
  },
  reactionCount: {
    color: colors.fg,
    fontSize: 12,
    fontWeight: '600',
  },
});