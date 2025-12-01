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
import { getArticles } from '../../api/manuals';
import { deleteArticle } from '../../api/admin';
import { colors, radius, spacing } from '../../theme/tokens';
import { useToast } from '../notification/toast/Toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import type { AdminStackParamList } from '../../navigation/admin/AdminStack';
import type { Article } from '../../api/manuals';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminArticleList'>;

export default function AdminArticleListScreen({ route, navigation }: Props) {
    const { sectionId, manualId } = route.params;
    const insets = useSafeAreaInsets();
    const headerHeight = useHeaderHeight();
    const topPad = Math.max(headerHeight, insets.top) + 15;
    const toast = useToast();
    const queryClient = useQueryClient();

    const { data: articles, isLoading, refetch } = useQuery({
        queryKey: ['articles', sectionId],
        queryFn: () => getArticles(sectionId),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteArticle,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['articles', sectionId] });
            queryClient.invalidateQueries({ queryKey: ['manual-stats', manualId] });
            toast.showToast('Article deleted', 'success');
        },
        onError: (error: any) => {
            toast.showToast(error.message || 'Error deleting article', 'error');
        },
    });

    const handleDelete = (articleId: string, title: string) => {
        Alert.alert(
            'Delete Article',
            `Are you sure you want to delete "${title}"? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => deleteMutation.mutate(articleId),
                },
            ]
        );
    };

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color='#fff' />
            </View>
        );
    }

    const articlesList = (articles ?? []) as Article[];

    return (
        <View style={styles.container}>
          <FlatList
            data={articlesList}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.list, { paddingTop: topPad }]}
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
                <Text style={styles.emptyText}>No articles yet</Text>
                <Text style={styles.emptySubtext}>
                  Create your first article for this section
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('AdminArticleEdit', { articleId: item.id, sectionId })}
              >
                <View style={styles.cardContent}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="document-text-outline" size={24} color="#4FFFBF" />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.cardOrder}>Order: {item.order_index}</Text>
                    {item.content_html && (
                      <Text style={styles.cardHint} numberOfLines={1}>
                        {item.content_html.length} characters
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('AdminArticleEdit', { articleId: item.id, sectionId })}
                  >
                    <Ionicons name="create-outline" size={20} color="#4FFFBF" />
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
            onPress={() => navigation.navigate('AdminArticleEdit', { sectionId })}
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
        alignItems: 'center',
        padding: spacing.md,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(79, 255, 191, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    cardInfo: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.fg,
        marginBottom: spacing.xs,
    },
    cardOrder: {
        fontSize: 12,
        color: 'rgba(232,238,247,0.5)',
        marginBottom: spacing.xs,
    },
    cardHint: {
        fontSize: 11,
        color: 'rgba(232,238,247,0.4)',
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
        fontWeight: '600',
        color: colors.fg,
    },
    emptySubtext: {
        marginTop: spacing.xs,
        fontSize: 14,
        color: 'rgba(232,238,247,0.5)',
        textAlign: 'center',
    },
});