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
  createArticle,
  updateArticle,
  deleteArticle,
} from '../../api/admin';
import { getArticle, getArticles } from '../../api/manuals';
import { colors, radius, spacing } from '../../theme/tokens';
import type { AdminStackParamList } from '../../navigation/admin/AdminStack';
import { useToast } from '../notification/toast/Toast';
import HtmlEditor from '../../components/admin/HtmlEditor';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminArticleEdit'>;

export default function AdminArticleEditScreen({ route, navigation }: Props) {
  const { articleId, sectionId } = route.params;
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const topPad = Math.max(headerHeight, insets.top) + 15;
  const toast = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [orderIndex, setOrderIndex] = useState(0);

  const { data: article, isLoading: loadingArticle } = useQuery({
    queryKey: ['article', articleId],
    queryFn: () => getArticle(articleId!),
    enabled: !!articleId,
  });

  const { data: articles } = useQuery({
    queryKey: ['articles', sectionId],
    queryFn: () => getArticles(sectionId),
  });

  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setContentHtml(article.content_html || '');
      setOrderIndex(article.order_index);
    } else if (articles && articles.length > 0) {
      const maxOrder = Math.max(...articles.map(a => a.order_index), 0);
      setOrderIndex(maxOrder + 1);
    }
  }, [article, articles]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (articleId) {
        return updateArticle(articleId, {
          title,
          content_html: contentHtml,
          order_index: orderIndex,
        });
      } else {
        return createArticle({
          section_id: sectionId,
          title,
          content_html: contentHtml,
          order_index: orderIndex,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles', sectionId] });
      toast.showToast(
        articleId ? 'Article updated' : 'Article created',
        'success'
      );
      navigation.goBack();
    },
    onError: (error: any) => {
      toast.showToast(error.message || 'Error saving', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteArticle(articleId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles', sectionId] });
      toast.showToast('Article deleted', 'success');
      navigation.goBack();
    },
    onError: (error: any) => {
      toast.showToast(error.message || 'Error deleting', 'error');
    },
  });

  const handleDelete = () => {
    Alert.alert(
      'Delete Article',
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

  if (loadingArticle) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: topPad }]}>
      <View style={styles.section}>
        <Text style={styles.label}>Article Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Article title"
          placeholderTextColor="rgba(255,255,255,0.4)"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>HTML Content</Text>
        <View style={styles.editorContainer}>
          <HtmlEditor
            value={contentHtml}
            onChange={setContentHtml}
            placeholder="Write the HTML content of the article..."
          />
        </View>
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
          Articles are ordered by this number (lower = first)
        </Text>
      </View>

      <View style={styles.actions}>
        {articleId && (
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
                <Text style={styles.deleteButtonText}>Delete Article</Text>
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
              {articleId ? 'Save Changes' : 'Create Article'}
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
  editorContainer: {
    height: 300,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
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