import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Pressable, Modal, Animated, ScrollView } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSections, getManual, getManualAck, type Section } from '../api/manuals';
import { getManualQuestions, submitAllAnswers, rpcAckManual } from '../api/quiz';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useToast } from '../screens/notification/toast/Toast';
import ErrorView from './error/ErrorView';
import EmptyState from './error/EmptyState';
import { NotesList } from './notes/NotesList';
import { SkeletonLoader } from './loader/SkeletonLoader';
import * as Haptics from 'expo-haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'ManualDetail'>;

export default function ManualDetailScreen({ route, navigation }: Props) {
  const { manualId } = route.params;
  const qc = useQueryClient();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const topPad = Math.max(headerHeight, insets.top) + 15;

  const { data: manual, isLoading: loadingManual, error: errorManual } = useQuery({
    queryKey: ['manual', manualId],
    queryFn: () => getManual(manualId),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: ack } = useQuery({
    queryKey: ['manual-ack', manualId],
    queryFn: () => getManualAck(manualId),
  });

  const { data: sections, isLoading: loadingSections } = useQuery({
    queryKey: ['sections', manualId],
    queryFn: () => getSections(manualId),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { mutateAsync: doAck, isPending } = useMutation({
    mutationFn: () => rpcAckManual(manualId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manual-ack', manualId] });
      qc.invalidateQueries({ queryKey: ['my-acks'] });
      qc.invalidateQueries({ queryKey: ['achievements'] });
    },
  });

  const [showQuiz, setShowQuiz] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const slideAnim = useRef(new Animated.Value(500)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(React.useCallback(() => {
    setShowQuiz(false);
    return () => setShowQuiz(false);
  }, [manualId]));

  useEffect(() => {
    if (showQuiz) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 500,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showQuiz]);
  
  const [answers, setAnswers] = useState<Record<string,'A'|'B'>>({});
  const { data: questions = [] } = useQuery({
    queryKey: ['manual-questions', manualId],
    queryFn: () => getManualQuestions(manualId),
    enabled: showQuiz,
  });

  if (loadingManual) {
    return (
      <View style={styles.loadingContainer}>
        <SkeletonLoader width="90%" height={32} style={{ marginBottom: spacing.md }} />
        <SkeletonLoader width="70%" height={20} style={{ marginBottom: spacing.lg }} />
        {[1, 2, 3].map((i) => (
          <SkeletonLoader key={i} width="100%" height={60} borderRadius={radius.xl} style={{ marginBottom: spacing.md }} />
        ))}
      </View>
    );
  }

  if (errorManual) {
    return (
      <ErrorView
        title="Unable to Load Manual"
        message="There was an error loading this manual. Please check your connection and try again."
        onRetry={() => {}}
        retryLabel="Retry"
      />
    );
  }

  if (!manual) {
    return (
      <ErrorView
        title="Manual Not Found"
        message="This manual could not be found or may have been removed."
        onRetry={() => {}}
        retryLabel="Retry"
      />
    );
  }

  const acked = !!ack && ack.ack_version >= (manual.manual_version ?? 1);
  const pdfUrl = manual.pdf_url ?? null;

  const handleQuizSubmit = async () => {
    if (questions.length === 0 || Object.keys(answers).length < questions.length) {
      toast.showToast('Please answer all questions', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await submitAllAnswers(answers);
      await doAck();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.showToast('Manual completed successfully! 🎉', 'success');
      
      setTimeout(() => {
        setShowQuiz(false);
        setAnswers({});
        setSubmitting(false);
      }, 800);
    } catch (err: any) {
      console.error('Failed to complete manual:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.showToast('Failed to complete manual. Please try again.', 'error');
      setSubmitting(false);
    }
  };

  const renderHeader = () => (
    <View style={[styles.header, { marginTop: topPad }]}>
      <LinearGradient
        colors={['rgba(79, 255, 164, 0.75)', 'rgba(79, 255, 208, 0.25)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.badge}
      >
        <Ionicons name="document-text-outline" size={24} color="#fff" />
      </LinearGradient>

      <Text style={styles.title}>{manual.title}</Text>
      {manual.description ? <Text style={styles.desc}>{manual.description}</Text> : null}

      <View style={styles.ctaRow}>
        {pdfUrl ? (
          <Pressable
            onPress={() => navigation.navigate('PDF', { manualId, pdfUrl, title: manual.title })}
            style={styles.primaryBtn}
            accessibilityLabel="Open PDF"
          >
            <Ionicons name="open-outline" size={18} color="#fff" />
            <Text style={styles.primaryText}>Open PDF</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => setShowQuiz(true)}
          disabled={isPending || acked}
          style={[styles.ghostBtn, acked && { opacity: 0.5 }]}
          accessibilityLabel={acked ? 'Manual completed' : 'Mark as completed'}
        >
          <Ionicons name={acked ? 'checkmark-done-outline' : 'sparkles-outline'} size={18} color={colors.fg} />
          <Text style={styles.ghostText}>{acked ? 'Completed' : 'Mark as completed'}</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        contentContainerStyle={styles.list}
        data={(sections ?? []) as Section[]}
        keyExtractor={(s) => s.id}
        ListHeaderComponent={
          <>
            {renderHeader()}
            {/* Sezione Notes */}
            <View style={styles.notesSection}>
              <NotesList 
                manualId={manualId}
                onNotePress={(note) => {
                  // Opzionale: scroll a una nota specifica o mostra dettagli
                }}
              />
            </View>
          </>
        }
        renderItem={({ item, index }) => (
          <AnimatedSectionRow
            item={item}
            index={index}
            onPress={() => navigation.navigate('Section', { sectionId: item.id, title: item.title })}
          />
        )}
        ListEmptyComponent={
          loadingSections ? (
            <View style={styles.emptyBox}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <EmptyState
              icon="list-outline"
              title="No Sections Available"
              message="This manual doesn't have any sections yet."
            />
          )
        }
      />

      <Modal visible={showQuiz} transparent animationType="none" onRequestClose={() => !submitting && setShowQuiz(false)}>
        <Animated.View style={[m.styles.backdrop, { opacity: backdropAnim }]}>
          <Pressable 
            style={{ flex: 1 }} 
            onPress={() => !submitting && setShowQuiz(false)}
            disabled={submitting}
          />
          <Animated.View style={[m.styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <ScrollView 
              showsVerticalScrollIndicator={true}
              contentContainerStyle={m.styles.scrollContent}
            >
              <View style={m.styles.modalHeader}>
                <View>
                  <Text style={m.styles.title}>Quick Check</Text>
                  <Text style={m.styles.progressText}>
                    {Object.keys(answers).length} of {questions.length} answered
                  </Text>
                </View>
                <Pressable 
                  onPress={() => !submitting && setShowQuiz(false)}
                  disabled={submitting}
                  accessibilityLabel="Close quiz"
                >
                  <Ionicons name="close" size={24} color={colors.fg} />
                </Pressable>
              </View>
              <Text style={m.styles.subtitle}>Answer all {questions.length} questions to complete this manual.</Text>

              {questions.map((q, idx) => {
                const value = answers[q.id];
                return (
                  <AnimatedQuestionBox
                    key={q.id}
                    index={idx}
                    question={q}
                    value={value}
                    onSelect={(choice) => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setAnswers((s) => ({ ...s, [q.id]: choice }));
                    }}
                  />
                );
              })}

              <View style={m.styles.footerRow}>
                <Pressable 
                  onPress={() => !submitting && setShowQuiz(false)} 
                  style={m.styles.cancelBtn}
                  disabled={submitting}
                >
                  <Text style={m.styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleQuizSubmit}
                  disabled={submitting || questions.length === 0 || Object.keys(answers).length < questions.length}
                  style={[
                    m.styles.ctaBtn,
                    (submitting || questions.length === 0 || Object.keys(answers).length < questions.length) && m.styles.ctaBtnDisabled,
                  ]}
                  accessibilityLabel="Submit answers"
                  accessibilityState={{ disabled: submitting || questions.length === 0 || Object.keys(answers).length < questions.length }}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={m.styles.ctaText}>Submit</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const BORDER = 'rgba(255,255,255,0.12)';

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.xl,
    paddingTop: spacing.xl * 2,
  },
  header: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, gap: 12 },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: { color: colors.fg, fontSize: 26, fontWeight: '800', marginBottom: 4 },
  desc: { color: 'rgba(232,238,247,0.75)', fontSize: 15, lineHeight: 22 },
  ctaRow: { flexDirection: 'row', gap: 10, marginTop: spacing.sm, flexWrap: 'wrap' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 145, 65, 0.44)',
    borderRadius: radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ghostText: { color: colors.fg, fontWeight: '700', fontSize: 15 },
  list: { paddingBottom: spacing.xl },
  row: {
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(79,140,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { color: colors.fg, fontSize: 16, flex: 1 },
  emptyBox: { alignItems: 'center', gap: 12, paddingVertical: spacing.xl * 2 },
  notesSection: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
});

const m = {
  styles: StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.87)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
      maxHeight: '90%',
    },
    scrollContent: {
      padding: spacing.lg,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    questionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    selectedBadge: {
      marginLeft: spacing.xs,
    },
    title: { color: colors.fg, fontSize: 20, fontWeight: '700' },
    progressText: {
      color: 'rgba(232,238,247,0.6)',
      fontSize: 13,
      marginTop: 2,
    },
    subtitle: { color: 'rgba(232,238,247,0.75)', marginBottom: spacing.md },
    qBox: { marginBottom: spacing.lg, gap: 10 },
    qText: { color: colors.fg, fontWeight: '500', fontSize: 15 },
    row: { flexDirection: 'row', gap: 10 },
    opt: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    optActive: { borderColor: 'rgba(79, 255, 193, 0.43)', backgroundColor: 'rgba(79, 255, 211, 0.18)' },
    optText: { color: colors.fg, fontSize: 14 },
    footerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: spacing.md },
    cancelBtn: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderColor: 'rgba(255,255,255,0.12)',
      borderWidth: 1,
      borderRadius: radius.mf,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    cancelText: { color: colors.fg, fontWeight: '700' },
    ctaBtn: {
      flex: 1,
      backgroundColor: 'rgba(2, 177, 81, 0.44)',
      borderRadius: radius.mf,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    ctaBtnDisabled: {
      opacity: 0.6,
    },
    ctaText: { color: '#fff', fontWeight: '800' },
  }),
};

function AnimatedQuestionBox({ index, question, value, onSelect }: {
  index: number;
  question: { id: string; idx: number; question: string; option_a: string; option_b: string };
  value?: 'A' | 'B';
  onSelect: (choice: 'A' | 'B') => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        m.styles.qBox,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={m.styles.questionHeader}>
        <Text style={m.styles.qText}>{question.idx}. {question.question}</Text>
        {value && (
          <View style={m.styles.selectedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          </View>
        )}
      </View>
      <View style={m.styles.row}>
        <AnimatedOption
          label="A"
          text={question.option_a}
          isSelected={value === 'A'}
          onPress={() => onSelect('A')}
        />
        <AnimatedOption
          label="B"
          text={question.option_b}
          isSelected={value === 'B'}
          onPress={() => onSelect('B')}
        />
      </View>
    </Animated.View>
  );
}

function AnimatedOption({ label, text, isSelected, onPress }: {
  label: string;
  text: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isSelected) {
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 0.95,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isSelected]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        m.styles.opt,
        isSelected && m.styles.optActive,
        pressed && { opacity: 0.8 },
      ]}
      accessibilityLabel={`Option ${label}`}
      accessibilityState={{ selected: isSelected }}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }], flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.success} />}
        <Text style={m.styles.optText}>{label}. {text}</Text>
      </Animated.View>
    </Pressable>
  );
}

function AnimatedSectionRow({ item, index, onPress }: {
  item: Section;
  index: number;
  onPress: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.row,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
        accessibilityLabel={`Section: ${item.title}`}
        accessibilityHint="Tap to view section articles"
      >
        <View style={styles.rowContent}>
          <View style={styles.rowIcon}>
            <Ionicons name="list-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.rowTitle}>{item.title}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>
    </Animated.View>
  );
}