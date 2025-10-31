import React from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getArticles, type Article } from '../api/manuals';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import ErrorView from './error/ErrorView';
import EmptyState from './error/EmptyState';
import { SkeletonLoader } from './loader/SkeletonLoader';

type Props = NativeStackScreenProps<RootStackParamList, 'Section'>;

export default function SectionScreen({ route, navigation }: Props) {
  const { sectionId } = route.params;
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const topPad = Math.max(headerHeight, insets.top) + 15;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['articles', sectionId],
    queryFn: () => getArticles(sectionId),
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.skeletonCard}>
            <SkeletonLoader width="100%" height={60} borderRadius={radius.xl} />
          </View>
        ))}
      </View>
    );
  }

  if (error) {
    return (
      <ErrorView
        title="Unable to Load Articles"
        message="There was an error loading articles. Please check your connection and try again."
        onRetry={() => refetch()}
        retryLabel="Retry"
      />
    );
  }

  const articles = (data ?? []) as Article[];

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[styles.list, { paddingTop: topPad }]}
      data={articles}
      keyExtractor={(a) => a.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Article', { articleId: item.id, title: item.title })}
          activeOpacity={0.9}
          accessibilityLabel={`Article: ${item.title}`}
          accessibilityHint="Tap to read article"
        >
          <View style={styles.cardContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <EmptyState
          icon="document-text-outline"
          title="No Articles Available"
          message="This section doesn't have any articles yet. Check back later!"
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  skeletonCard: {
    marginBottom: spacing.lg,
  },
  list: {
    padding: spacing.xl,
    paddingBottom: spacing.xl * 2,
  },
  card: {
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: spacing.lg,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(79, 140, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 16,
    color: colors.fg,
    fontWeight: '500',
  },
});