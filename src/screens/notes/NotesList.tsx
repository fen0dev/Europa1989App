import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Modal, TextInput, ScrollView, ActivityIndicator, Animated, PanResponder, Dimensions, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { colors, radius, spacing } from '../../theme/tokens';
import { getManualNotes, createManualNote, NoteType, ManualNote } from '../../api/notes';
import { NoteCard } from './NoteCard';
import { useToast } from '../../screens/notification/toast/Toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { logger, handleApiError } from '../../lib/errors';
import { useAdmin } from '../../hooks/useAdmin';
import { deleteNoteAdmin, reportNoteAdmin } from '../../api/admin';
import { SwipeableNoteCard } from './SwipeableNoteCard';
import { toggleNoteVisibility } from '../../api/notes';
import { toggleNotePin } from '../../api/admin';

type NoteListProps = {
  manualId: string;
  sectionId?: string;
  articleId?: string;
  onNotePress?: (note: ManualNote) => void;
};

const NOTE_TYPES: { type: NoteType, icon: string; label: string; color: string; }[] = [
    { type: 'tip', icon: 'bulb-outline', label: 'Tip', color: '#4CAF50' }, // Green
    { type: 'warn', icon: 'warning-outline', label: 'Warn', color: '#FFC107' }, // Yellow
    { type: 'ask', icon: 'help-circle-outline', label: 'Ask', color: '#9C27B0' }, // Purple
    { type: 'clarify', icon: 'chatbubble-ellipses-outline', label: 'Clarify', color: '#2196F3' }, // Blue
];

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;
const DRAG_THRESHOLD = 100;

export function NotesList({ manualId, sectionId, articleId, onNotePress }: NoteListProps) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [noteContent, setNoteContent] = useState('');
    const [selectedType, setSelectedType] = useState<NoteType>('tip');
    const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'oldest'>('recent');
    const insets = useSafeAreaInsets();
    const toasts = useToast();
    const queryClient = useQueryClient();
    const { isAdmin } = useAdmin();

    const { data: notes = [], isLoading, refetch } = useQuery({
        queryKey: ['manual-notes', manualId, sectionId, articleId],
        queryFn: () => getManualNotes(manualId, { sectionId, articleId, sortBy }),
    });

    const { mutate: createNote, isPending: isCreating } = useMutation({
        mutationFn: () => createManualNote({
            manual_id: manualId,
            section_id: sectionId || null,
            article_id: articleId || null,
            content: noteContent.trim(),
            note_type: selectedType,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: ['manual-notes', manualId, sectionId, articleId],
              exact: true
            });
            setShowAddModal(false);
            setNoteContent('');
            toasts.showToast('Note created successfully', 'success');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: (err: any) => {
          const appError = handleApiError(err);
          toasts.showToast(appError.userMessage || 'Failed to add note. Please try again.', 'error');
          logger.error('Failed to create note', err, { manualId, sectionId, articleId });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (noteId: string) => deleteNoteAdmin(noteId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['manual-notes', manualId, sectionId, articleId],
                exact: true
            });
            toasts.showToast('Note deleted successfully', 'success');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: (err: any) => {
            const appError = handleApiError(err);
            toasts.showToast(appError.userMessage || 'Failed to delete note', 'error');
            logger.error('Failed to delete note', err);
        },
    });

    const pinMutation = useMutation({
        mutationFn: (noteId: string) => toggleNotePin(noteId, !notes.find(n => n.id === noteId)?.is_pinned),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['manual-notes', manualId, sectionId, articleId],
                exact: true
            });
            toasts.showToast('Note pinned', 'success');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: (err: any) => {
            const appError = handleApiError(err);
            toasts.showToast(appError.userMessage || 'Failed to pin note', 'error');
        },
    });

    const hideMutation = useMutation({
        mutationFn: (noteId: string) => {
            const note = notes.find(n => n.id === noteId);
            return toggleNoteVisibility(noteId, note?.is_public ?? true);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['manual-notes', manualId, sectionId, articleId],
                exact: true
            });
            toasts.showToast('Note visibility updated', 'success');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: (err: any) => {
            const appError = handleApiError(err);
            toasts.showToast(appError.userMessage || 'Failed to update note', 'error');
        },
    });

    const reportMutation = useMutation({
        mutationFn: (noteId: string) => reportNoteAdmin(noteId, manualId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['manual-notes', manualId, sectionId, articleId],
                exact: true
            });
            toasts.showToast('Note reported', 'success');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: (err: any) => {
            const appError = handleApiError(err);
            toasts.showToast(appError.userMessage || 'Failed to report note', 'error');
        },
    });

    const handleDeleteNote = (noteId: string) => {
        Alert.alert(
            'Delete Note',
            'Are you sure you want to delete this note? This action cannot be undone.',
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

    const handlePin = (noteId: string) => {
      pinMutation.mutate(noteId);
    };

    const handleReport = (noteId: string) => {
      Alert.alert(
        'Report note',
        'Are you sure you want to report this note? The author will be notified.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Report',
            style: 'destructive',
            onPress: () => reportMutation.mutate(noteId),
          },
        ]
      );
    };

    const handleHide = (noteId: string) => {
      const note = notes.find(n => n.id === noteId);
      Alert.alert(
        'Hide note',
        `Sure you want to ${note?.is_public ? 'hide' : 'show'} this note?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: note?.is_public ? 'Hide' : 'Show',
            onPress: () => hideMutation.mutate(noteId),
          },
        ]
      );
    };

    const handleAddNote = () => {
        if (noteContent.trim().length < 10) {
            toasts.showToast('Note must be at least 10 characters', 'warning');
            return;
        }
        if (noteContent.trim().length > 500) {
            toasts.showToast('Note must be less than 500 characters', 'warning');
            return;
        }
        createNote();
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.loadingText}>Loading notes...</Text>
          </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Ionicons name="document-text-outline" size={18} color={colors.fg} />
                    <Text style={styles.headerTitle}>
                        {notes.length} {notes.length === 1 ? 'Note' : 'Notes'}
                    </Text>
                </View>
                <View style={styles.headerRight}>
                    <Pressable
                        onPress={() => {
                            const options: ('recent' | 'helpful' | 'oldest')[] = ['recent', 'helpful', 'oldest'];
                            const currentIndex = options.indexOf(sortBy);
                            setSortBy(options[(currentIndex + 1) % options.length]);
                        }}
                        style={styles.sortBtn}
                    >
                        <Ionicons name="swap-vertical-outline" size={16} color={colors.fg} />
                    </Pressable>
                    <Pressable
                        onPress={() => setShowAddModal(true)}
                        style={styles.addBtn}
                    >
                        <Ionicons name="add" size={18} color="#fff" />
                        <Text style={styles.addBtnText}>Add Note</Text>
                    </Pressable>
                </View>
            </View>

            {notes.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="document-text-outline" size={48} color="rgba(255, 255, 255, 0.3)" />
                    <Text style={styles.emptyTitle}>No notes yet</Text>
                    <Text style={styles.emptySubtitle}>
                        Be the first to share a tip or ask a question!
                    </Text>
                    <Pressable
                        onPress={() => setShowAddModal(true)}
                        style={styles.emptyAddBtn}
                    >
                        <Ionicons name="add" size={20} color='#fff' />
                        <Text style={styles.emptyAddBtnText}>Add First Note</Text>
                    </Pressable>
                </View>
            ) : (
                <View style={styles.notesContainer}>
                  <FlatList
                      data={notes}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                          <SwipeableNoteCard
                              note={item}
                              manualId={manualId}
                              onPress={() => onNotePress?.(item)}
                              onDelete={isAdmin ? () => handleDeleteNote(item.id) : undefined}
                              onPin={() => handlePin(item.id)}
                              onReport={isAdmin ? () => handleReport(item.id) : undefined}
                              onHide={!isAdmin ? () => handleHide(item.id) : undefined}
                          />
                      )}
                      contentContainerStyle={styles.listContent}
                      showsHorizontalScrollIndicator={false}
                  />
                </View>
            )}

            <AddNoteModal
                visible={showAddModal}
                onClose={() => {
                    setShowAddModal(false);
                    setNoteContent('');
                }}
                noteContent={noteContent}
                onNoteContentChange={setNoteContent}
                selectedType={selectedType}
                onTypeChange={setSelectedType}
                onSubmit={handleAddNote}
                isSubmitting={isCreating}
                insets={insets}
            />
        </View>
    );
}

function AddNoteModal({
    visible,
    onClose,
    noteContent,
    onNoteContentChange,
    selectedType,
    onTypeChange,
    onSubmit,
    isSubmitting,
    insets,
}: {
    visible: boolean;
    onClose: () => void;
    noteContent: string;
    onNoteContentChange: (text: string) => void;
    selectedType: NoteType;
    onTypeChange: (type: NoteType) => void;
    onSubmit: () => void;
    isSubmitting: boolean;
    insets: { top: number; bottom: number; };
}) {
    const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const pan = useRef(new Animated.ValueXY()).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dy) > 5;
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    pan.setValue({ x: 0, y: gestureState.dy });
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > DRAG_THRESHOLD) {
                    closeSheet();
                } else {
                    Animated.spring(pan, {
                        toValue: { x: 0, y: 0 },
                        useNativeDriver: true,
                        tension: 50,
                        friction: 8,
                    }).start();
                }
            },
        })
    ).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 50,
                    friction: 8,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: SHEET_HEIGHT,
                    useNativeDriver: true,
                    tension: 50,
                    friction: 8,
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
            pan.setValue({ x: 0, y: 0 });
        }
    }, [visible]);

    const closeSheet = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        pan.setValue({ x: 0, y: 0 });
        onClose();
    };

    const charCount = noteContent.length;
    const isValid = charCount >= 10 && charCount <= 500;

    const sheetStyle = {
        transform: [
            {
                translateY: Animated.add(
                    translateY,
                    pan.y
                ),
            },
        ],
    };

    return (
        <Modal 
            visible={visible} 
            transparent 
            animationType="none" 
            onRequestClose={closeSheet}
            statusBarTranslucent
        >
            <View style={styles.modalContainer}>
                {/* Backdrop */}
                <Animated.View
                    style={[
                        styles.modalBackdrop,
                        {
                            opacity,
                        },
                    ]}
                >
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                </Animated.View>

                {/* Backdrop press handler */}
                <Pressable
                    style={styles.backdropPressable}
                    onPress={closeSheet}
                />

                {/* Sheet */}
                <Animated.View
                    style={[
                        styles.modalSheet,
                        {
                            height: SHEET_HEIGHT,
                            paddingBottom: insets.bottom,
                            ...sheetStyle,
                        },
                    ]}
                    {...panResponder.panHandlers}
                >
                    <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                    
                    {/* Handle bar */}
                    <View style={styles.handleContainer}>
                        <View style={styles.handle} />
                    </View>

                    <View style={styles.modalContent}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Note</Text>
                            <Pressable onPress={closeSheet} disabled={isSubmitting}>
                                <Ionicons name="close" size={24} color={colors.fg} />
                            </Pressable>
                        </View>
            
                        {/* Tipo nota */}
                        <View style={styles.typeSelector}>
                            {NOTE_TYPES.map((type) => (
                                <Pressable
                                    key={type.type}
                                    onPress={() => onTypeChange(type.type)}
                                    style={[
                                        styles.typeOption,
                                        selectedType === type.type && [styles.typeOptionActive, { borderColor: type.color }],
                                    ]}
                                >
                                    <Ionicons
                                        name={type.icon as any}
                                        size={18}
                                        color={selectedType === type.type ? type.color : 'rgba(255,255,255,0.6)'}
                                    />
                                    <Text
                                        style={[
                                        styles.typeOptionText,
                                        selectedType === type.type && { color: type.color },
                                        ]}
                                    >
                                        {type.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
            
                        {/* Textarea */}
                        <TextInput
                            style={styles.textInput}
                            value={noteContent}
                            onChangeText={onNoteContentChange}
                            placeholder="Share a tip, ask a question, or add clarification..."
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            multiline
                            maxLength={500}
                            textAlignVertical="top"
                        />
            
                        {/* Char counter e submit */}
                        <View style={styles.modalFooter}>
                          <Text style={[styles.charCount, !isValid && styles.charCountError]}>
                            {charCount}/500
                          </Text>
                          <Pressable
                            onPress={onSubmit}
                            disabled={!isValid || isSubmitting}
                            style={[
                              styles.submitBtn,
                              (!isValid || isSubmitting) && styles.submitBtnDisabled,
                            ]}
                          >
                            {isSubmitting ? (
                              <ActivityIndicator color="#fff" />
                            ) : (
                              <>
                                <Ionicons name="checkmark-outline" size={18} color="#fff" />
                                <Text style={styles.submitBtnText}>Add Note</Text>
                              </>
                            )}
                          </Pressable>
                        </View>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}
    
    const styles = StyleSheet.create({
      container: {
        flex: 1,
      },
      loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        gap: spacing.md,
      },
      loadingText: {
        color: 'rgba(232,238,247,0.7)',
        fontSize: 14,
      },
      header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
      },
      headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
      },
      headerTitle: {
        color: colors.fg,
        fontSize: 14,
        fontWeight: '700',
      },
      headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
      },
      sortBtn: {
        padding: spacing.xs,
      },
      addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: 'rgba(38, 136, 62, 0.58)',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.lg,
      },
      addBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
      },
      listContent: {
        padding: spacing.md,
      },
      notesContainer: {
        marginTop: spacing.md,
      },
      emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl * 2,
        gap: spacing.md,
      },
      emptyTitle: {
        color: colors.fg,
        fontSize: 18,
        fontWeight: '700',
      },
      emptySubtitle: {
        color: 'rgba(232,238,247,0.7)',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: spacing.md,
      },
      emptyAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radius.xl,
        backgroundColor: 'rgba(79, 255, 188, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(79, 255, 129, 0.3)',
      },
      emptyAddBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
      },
      modalBackdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
      },
      modalSheet: {
        maxHeight: '90%',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.bg,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
      },
      modalContent: {
        padding: spacing.lg,
      },
      modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
      },
      modalTitle: {
        color: colors.fg,
        fontSize: 20,
        fontWeight: '700',
      },
      typeSelector: {
        flexDirection: 'row',
        gap: spacing.xs,
        marginBottom: spacing.md,
      },
      typeOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm,
        borderRadius: radius.lg,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
      },
      typeOptionActive: {
        backgroundColor: 'rgba(79, 141, 255, 0.02)',
        borderColor: 'rgba(79, 140, 255, 0.5)',
      },
      typeOptionText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontWeight: '600',
      },
      typeOptionTextActive: {
        color: colors.fg,
      },
      textInput: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        borderRadius: radius.xl,
        padding: spacing.md,
        color: colors.fg,
        fontSize: 15,
        minHeight: 120,
        marginBottom: spacing.md,
      },
      modalFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      },
      charCount: {
        color: 'rgba(232,238,247,0.6)',
        fontSize: 12,
      },
      charCountError: {
        color: colors.error,
      },
      submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: 'rgba(38, 136, 62, 0.58)',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radius.xl,
      },
      submitBtnDisabled: {
        opacity: 0.5,
      },
      submitBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
      },
      modalContainer: {
        flex: 1,
      },
      backdropPressable: {
        ...StyleSheet.absoluteFillObject,
      },
      handleContainer: {
        alignItems: 'center',
        paddingVertical: spacing.sm,
      },
      handle: {
        width: 36,
        height: 5,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.3)',
      },
      cardReported: {
        borderColor: 'rgba(255, 107, 107, 0.4)',
        backgroundColor: 'rgba(255, 107, 107, 0.08)',
      },
      adminActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
      },
      adminActionBtn: {
        padding: spacing.xs,
      },
});