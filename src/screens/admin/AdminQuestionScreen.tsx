import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from '../../api/admin';
import { getManualQuestions } from '../../api/quiz';
import { colors, radius, spacing } from '../../theme/tokens';
import type { AdminStackParamList } from '../../navigation/admin/AdminStack';
import { useToast } from '../notification/toast/Toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminQuestions'>;

export default function AdminQuestionsScreen({ route, navigation }: Props) {
  const { manualId } = route.params;
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const topPad = Math.max(headerHeight, insets.top) + 15;
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: questions, isLoading } = useQuery({
    queryKey: ['manual-questions', manualId],
    queryFn: () => getManualQuestions(manualId),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-questions', manualId] });
      toast.showToast('Question deleted', 'success');
    },
    onError: (error: any) => {
      toast.showToast(error.message || 'Error deleting', 'error');
    },
  });

  const handleDelete = (questionId: string, idx: number) => {
    Alert.alert(
      'Delete Question',
      `Are you sure you want to delete question #${idx}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(questionId),
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
      <FlatList
        data={questions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingTop: topPad }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Quiz Questions</Text>
            <Text style={styles.subtitle}>
              {questions?.length || 0} total questions
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="help-circle-outline" size={64} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyText}>No questions yet</Text>
            <Text style={styles.emptySubtext}>
              Add questions to create the manual quiz
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <QuestionCard
            question={item}
            index={index + 1}
            manualId={manualId}
            onDelete={() => handleDelete(item.id, item.idx)}
            onEdit={() => setEditingId(item.id)}
            isEditing={editingId === item.id}
            onCancelEdit={() => setEditingId(null)}
          />
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddForm(true)}
      >
        <Ionicons name="add" size={28} color="#0b0f14" />
      </TouchableOpacity>

      {showAddForm && (
        <QuestionFormModal
          manualId={manualId}
          onClose={() => setShowAddForm(false)}
          onSuccess={() => {
            setShowAddForm(false);
            queryClient.invalidateQueries({ queryKey: ['manual-questions', manualId] });
          }}
        />
      )}
    </View>
  );
}

function QuestionCard({
  question,
  index,
  manualId,
  onDelete,
  onEdit,
  isEditing,
  onCancelEdit,
}: {
  question: any;
  index: number;
  manualId: string;
  onDelete: () => void;
  onEdit: () => void;
  isEditing: boolean;
  onCancelEdit: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [questionText, setQuestionText] = useState(question.question);
  const [optionA, setOptionA] = useState(question.option_a);
  const [optionB, setOptionB] = useState(question.option_b);

  const updateMutation = useMutation({
    mutationFn: (updates: any) => updateQuestion(question.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-questions', manualId] });
      toast.showToast('Question updated', 'success');
      onCancelEdit();
    },
    onError: (error: any) => {
      toast.showToast(error.message || 'Error updating', 'error');
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      question: questionText,
      option_a: optionA,
      option_b: optionB,
    });
  };

  if (isEditing) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIndex}>#{index}</Text>
          <View style={styles.cardActions}>
            <TouchableOpacity onPress={handleSave} disabled={updateMutation.isPending}>
              <Ionicons name="checkmark" size={24} color="#4FFFBF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onCancelEdit}>
              <Ionicons name="close" size={24} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        </View>
        <TextInput
          style={styles.editInput}
          value={questionText}
          onChangeText={setQuestionText}
          placeholder="Question"
          placeholderTextColor="rgba(255,255,255,0.4)"
          multiline
        />
        <TextInput
          style={styles.editInput}
          value={optionA}
          onChangeText={setOptionA}
          placeholder="Option A"
          placeholderTextColor="rgba(255,255,255,0.4)"
        />
        <TextInput
          style={styles.editInput}
          value={optionB}
          onChangeText={setOptionB}
          placeholder="Option B"
          placeholderTextColor="rgba(255,255,255,0.4)"
        />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIndex}>#{index}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={onEdit}>
            <Ionicons name="create-outline" size={20} color="#4FFFBF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete}>
            <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.questionText}>{question.question}</Text>
      <View style={styles.options}>
        <View style={styles.option}>
          <Text style={styles.optionLabel}>A:</Text>
          <Text style={styles.optionText}>{question.option_a}</Text>
        </View>
        <View style={styles.option}>
          <Text style={styles.optionLabel}>B:</Text>
          <Text style={styles.optionText}>{question.option_b}</Text>
        </View>
      </View>
    </View>
  );
}

function QuestionFormModal({
  manualId,
  onClose,
  onSuccess,
}: {
  manualId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [question, setQuestion] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: questions } = useQuery({
    queryKey: ['manual-questions', manualId],
    queryFn: () => getManualQuestions(manualId),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const nextIdx = questions ? Math.max(...questions.map(q => q.idx), 0) + 1 : 1;
      return createQuestion({
        manual_id: manualId,
        idx: nextIdx,
        question,
        option_a: optionA,
        option_b: optionB,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-questions', manualId] });
      toast.showToast('Question created', 'success');
      onSuccess();
    },
    onError: (error: any) => {
      toast.showToast(error.message || 'Error creating', 'error');
    },
  });

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>New Question</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent}>
          <Text style={styles.label}>Question *</Text>
          <TextInput
            style={styles.input}
            value={question}
            onChangeText={setQuestion}
            placeholder="Enter the question"
            placeholderTextColor="rgba(255,255,255,0.4)"
            multiline
          />
          <Text style={styles.label}>Option A *</Text>
          <TextInput
            style={styles.input}
            value={optionA}
            onChangeText={setOptionA}
            placeholder="First option"
            placeholderTextColor="rgba(255,255,255,0.4)"
          />
          <Text style={styles.label}>Option B *</Text>
          <TextInput
            style={styles.input}
            value={optionB}
            onChangeText={setOptionB}
            placeholder="Second option"
            placeholderTextColor="rgba(255,255,255,0.4)"
          />
        </ScrollView>
        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, (!question.trim() || !optionA.trim() || !optionB.trim() || createMutation.isPending) && styles.saveButtonDisabled]}
            onPress={() => createMutation.mutate()}
            disabled={!question.trim() || !optionA.trim() || !optionB.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#0b0f14" />
            ) : (
              <Text style={styles.saveButtonText}>Create</Text>
            )}
          </TouchableOpacity>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  list: {
    padding: spacing.xl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.fg,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(232,238,247,0.7)',
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
  cardIndex: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4FFFBF',
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.fg,
    marginBottom: spacing.md,
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4FFFBF',
    width: 20,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(232,238,247,0.8)',
  },
  editInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.md,
    padding: spacing.sm,
    color: colors.fg,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: spacing.sm,
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
    fontWeight: '600',
    color: colors.fg,
  },
  emptySubtext: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: 'rgba(232,238,247,0.5)',
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: colors.bg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.fg,
  },
  modalContent: {
    padding: spacing.md,
    maxHeight: 400,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.fg,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.fg,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalActions: {
    flexDirection: 'row',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.fg,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#4FFFBF',
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