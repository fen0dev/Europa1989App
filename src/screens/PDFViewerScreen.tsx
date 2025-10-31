import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform, Pressable, Text, Modal, Animated, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, spacing, radius } from '../theme/tokens';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { getManual, getManualAck } from '../api/manuals';
import { getManualQuestions, submitManualAnswer, rpcAckManual } from '../api/quiz';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from './notification/toast/Toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

type Props = { route: any; navigation: any };

export default function PDFViewerScreen({ route, navigation }: Props) {
    const { pdfUrl, manualId, title } = route.params as { pdfUrl: string; manualId: string; title?: string };
    const qc = useQueryClient();
    const toast = useToast();
    const insets = useSafeAreaInsets();

    const { data: manual } = useQuery({
        queryKey: ['manual', manualId],
        queryFn: () => getManual(manualId),
    });

    const { data: ack } = useQuery({
        queryKey: ['manual-ack', manualId],
        queryFn: () => getManualAck(manualId),
    });

    const acked = !!ack && manual && ack.ack_version >= (manual.manual_version ?? 1);

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
    const [pdfLoading, setPdfLoading] = useState(true);
    const [pdfError, setPdfError] = useState(false);
    const slideAnim = useRef(new Animated.Value(500)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

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

    const [answers, setAnswers] = useState<Record<string, 'A' | 'B'>>({});
    const { data: questions = [] } = useQuery({
        queryKey: ['manual-questions', manualId],
        queryFn: () => getManualQuestions(manualId),
        enabled: showQuiz,
    });

    const uri = Platform.OS === 'android' ?
        `https://drive.google.com/viewerng/viewer?embedded=1&url=${encodeURIComponent(pdfUrl)}`
        : pdfUrl;

    const handleQuizSubmit = async () => {
        if (questions.length === 0 || Object.keys(answers).length < questions.length) {
            toast.showToast('Please answer all questions', 'warning');
            return;
        }

        setSubmitting(true);
        try {
            for (const q of questions) {
                const c = answers[q.id];
                if (c === 'A' || c === 'B') {
                    await submitManualAnswer(q.id, c);
                }
            }
            
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

    return (
        <View style={styles.container}>
            {pdfLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading PDF...</Text>
                </View>
            )}
            
            {pdfError && (
                <View style={styles.errorOverlay}>
                    <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
                    <Text style={styles.errorText}>Failed to load PDF</Text>
                    <Pressable
                        onPress={() => {
                            setPdfError(false);
                            setPdfLoading(true);
                        }}
                        style={styles.retryBtn}
                    >
                        <Ionicons name="refresh-outline" size={18} color={colors.fg} />
                        <Text style={styles.retryText}>Retry</Text>
                    </Pressable>
                </View>
            )}

            <WebView
                source={{ uri }}
                style={{ flex: 1 }}
                startInLoadingState={true}
                onLoadStart={() => {
                    setPdfLoading(true);
                    setPdfError(false);
                }}
                onLoadEnd={() => {
                    setPdfLoading(false);
                    setPdfError(false);
                }}
                onError={() => {
                    setPdfLoading(false);
                    setPdfError(true);
                    toast.showToast('Error loading PDF. Please try again.', 'error');
                }}
                renderLoading={() => (
                    <View style={styles.loading}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                )}
            />

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
                <Pressable
                    onPress={() => setShowQuiz(true)}
                    disabled={isPending || acked}
                    style={({ pressed }) => [
                        styles.ackBtn,
                        (isPending || acked) && styles.ackBtnDisabled,
                        pressed && { opacity: 0.85 },
                    ]}
                    accessibilityLabel={acked ? 'Manual completed' : 'Mark as completed'}
                    accessibilityState={{ disabled: isPending || acked }}
                >
                    <Ionicons
                        name={acked ? 'checkmark-done-outline' : 'sparkles-outline'}
                        size={18}
                        color="#fff"
                        style={{ marginRight: 8 }}
                    />
                    <Text style={styles.ackText}>
                        {isPending ? 'Saving...' : acked ? 'Completed' : 'Mark as completed'}
                    </Text>
                </Pressable>
            </View>

            {/* Modal Quiz */}
            <Modal visible={showQuiz} transparent animationType="none" onRequestClose={() => !submitting && setShowQuiz(false)}>
                <Animated.View style={[modalStyles.backdrop, { opacity: backdropAnim }]}>
                    <Pressable 
                        style={{ flex: 1 }} 
                        onPress={() => !submitting && setShowQuiz(false)}
                        disabled={submitting}
                    />
                    <Animated.View style={[modalStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
                        <ScrollView
                            showsVerticalScrollIndicator={true}
                            contentContainerStyle={modalStyles.scrollContent}
                        >
                            <View style={modalStyles.modalHeader}>
                                <View>
                                    <Text style={modalStyles.title}>Quick Check</Text>
                                    <Text style={modalStyles.progressText}>
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
                            <Text style={modalStyles.subtitle}>Answer all {questions.length} questions to complete this manual.</Text>

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

                            <View style={modalStyles.footerRow}>
                                <Pressable
                                    onPress={() => !submitting && setShowQuiz(false)}
                                    style={modalStyles.cancelBtn}
                                    disabled={submitting}
                                >
                                    <Text style={modalStyles.cancelText}>Cancel</Text>
                                </Pressable>
                                <Pressable
                                    onPress={handleQuizSubmit}
                                    disabled={submitting || questions.length === 0 || Object.keys(answers).length < questions.length}
                                    style={[
                                        modalStyles.ctaBtn,
                                        (submitting || questions.length === 0 || Object.keys(answers).length < questions.length) && modalStyles.ctaBtnDisabled,
                                    ]}
                                    accessibilityLabel="Submit answers"
                                    accessibilityState={{ disabled: submitting || questions.length === 0 || Object.keys(answers).length < questions.length }}
                                >
                                    {submitting ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={modalStyles.ctaText}>Submit</Text>
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
                modalStyles.qBox,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <View style={modalStyles.questionHeader}>
                <Text style={modalStyles.qText}>{question.idx}. {question.question}</Text>
                {value && (
                    <View style={modalStyles.selectedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    </View>
                )}
            </View>
            <View style={modalStyles.row}>
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
                modalStyles.opt,
                isSelected && modalStyles.optActive,
                pressed && { opacity: 0.8 },
            ]}
            accessibilityLabel={`Option ${label}`}
            accessibilityState={{ selected: isSelected }}
        >
            <Animated.View style={{ transform: [{ scale: scaleAnim }], flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.success} />}
                <Text style={modalStyles.optText}>{label}. {text}</Text>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bg,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    loadingText: {
        color: 'rgba(232,238,247,0.7)',
        marginTop: spacing.md,
        fontSize: 15,
    },
    errorOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
        padding: spacing.xl,
    },
    errorText: {
        color: colors.error,
        fontSize: 16,
        marginTop: spacing.md,
        marginBottom: spacing.lg,
        textAlign: 'center',
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        borderRadius: radius.xl,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    retryText: {
        color: colors.fg,
        fontSize: 15,
        fontWeight: '600',
    },
    footer: {
        padding: spacing.lg,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    ackBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 145, 65, 0.44)',
        borderRadius: radius.xl,
        paddingVertical: spacing.md,
    },
    ackBtnDisabled: {
        opacity: 0.5,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    ackText: { color: '#fff', fontWeight: '700' },
});

const modalStyles = StyleSheet.create({
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
    title: { color: colors.fg, fontSize: 20, fontWeight: '700' },
    progressText: {
        color: 'rgba(232,238,247,0.6)',
        fontSize: 13,
        marginTop: 2,
    },
    subtitle: { color: 'rgba(232,238,247,0.75)', marginBottom: spacing.md },
    qBox: { marginBottom: spacing.lg, gap: 10 },
    questionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    selectedBadge: {
        marginLeft: spacing.xs,
    },
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
        borderRadius: radius.xl,
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    cancelText: { color: colors.fg, fontWeight: '700' },
    ctaBtn: {
        flex: 1,
        backgroundColor: 'rgba(2, 177, 81, 0.44)',
        borderRadius: radius.xl,
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    ctaBtnDisabled: {
        opacity: 0.6,
    },
    ctaText: { color: '#fff', fontWeight: '800' },
});