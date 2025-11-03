import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ImageBackground,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Animated,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getAchievements, type Achievement } from '../api/achievements';
import { colors, radius, spacing, shadow } from '../theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import ErrorView from './error/ErrorView';
import EmptyState from './error/EmptyState';
import { ManualCardSkeleton } from './loader/SkeletonLoader';
import NotificationButton from '../components/NotificationButton';

function formatWhen(d?: string | null) {
  if (!d) return 'Completed';
  try {
    const dt = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - dt.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Completed today';
    if (diffDays === 1) return 'Completed yesterday';
    if (diffDays < 7) return `Completed ${diffDays} days ago`;
    if (diffDays < 30) return `Completed ${Math.floor(diffDays / 7)} weeks ago`;
    return `Completed ${Math.floor(diffDays / 30)} months ago`;
  } catch {
    return 'Completed';
  }
}

export default function AchievementScreen() {
  const navigation = useNavigation<any>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const topPad = Math.max(headerHeight, insets.top) + 16;

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['achievements'],
    queryFn: getAchievements,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <FlatList
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={[styles.list, { paddingTop: topPad }]}
        data={[1, 2, 3]}
        keyExtractor={(i) => i.toString()}
        renderItem={() => <ManualCardSkeleton />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.headerText}>
                <Text style={styles.title}>Achievements</Text>
                <Text style={styles.subtitle}>Manuals you've completed. Review anytime.</Text>
              </View>
            </View>
            <NotificationButton />
          </View>
        }
      />
    );
  }

  if (error) {
    return (
      <ErrorView
        title="Unable to Load Achievements"
        message="There was an error loading your achievements. Please check your connection and try again."
        onRetry={() => refetch()}
        retryLabel="Retry"
      />
    );
  }

  const achievements = (data ?? []) as Achievement[];

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[styles.list, { paddingTop: topPad }]}
      data={achievements}
      keyExtractor={(a) => a.manual.id}
      refreshControl={
        <RefreshControl
          tintColor="#fff"
          refreshing={isRefetching}
          onRefresh={() => refetch()}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Achievements</Text>
              <Text style={styles.subtitle}>Manuals completed. Review anytime.</Text>
            </View>
          </View>
          <NotificationButton />
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon="checkmark-circle-outline"
          title="No Achievements Yet"
          message="Complete your first manual to earn an achievement! Start reading to unlock your first trophy."
        />
      }
      renderItem={({ item, index }) => (
        <AnimatedAchievementCard
          item={item}
          index={index}
          navigation={navigation}
        />
      )}
    />
  );
}

const CARD_BG = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.12)';

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl * 2 },
  header: {
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  headerText: {
    flex: 1,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { color: colors.fg, fontSize: 30, fontWeight: '800' },
  subtitle: { color: 'rgba(232,238,247,0.7)', marginTop: 6 },
  card: {
    marginBottom: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    ...shadow.ios,
    ...shadow.android,
  },
  cardInner: { 
    flexDirection: 'row',
    padding: spacing.md,
  },
  cover: { 
    width: 84, 
    height: 84, 
    borderRadius: radius.xl, 
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  overlay: { flex: 1, borderRadius: radius.xl },
  meta: { 
    flex: 1, 
    paddingLeft: spacing.md, 
    paddingVertical: spacing.xs,
    justifyContent: 'space-between',
  },
  cardTitle: { 
    color: colors.fg, 
    fontSize: 16, 
    fontWeight: '700', 
    marginBottom: spacing.xs,
  },
  desc: { 
    color: 'rgba(232,238,247,0.75)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  footerColumn: { 
    gap: spacing.sm,
  },
  whenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
  },
  when: { 
    color: 'rgba(232,238,247,0.65)', 
    fontSize: 12,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: BORDER,
    alignSelf: 'flex-start',
  },
  reviewText: { 
    color: colors.fg, 
    fontWeight: '600', 
    fontSize: 13,
  },
  completionPlaceholder: {
    marginTop: 0,
    alignItems: 'flex-start',
  },
  placeholderStack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  placeholderBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderCopy: {
    gap: 4,
  },
  placeholderTitle: {
    color: colors.fg,
    fontWeight: '700',
    fontSize: 13,
  },
  placeholderSubtitle: {
    color: 'rgba(232,238,247,0.7)',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  completionRow: {
    marginTop: 0,
    padding: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 120,
  },
  stackItem: {
    width: 48,
    height: 48,
  },
  stackBubble: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  stackAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  stackAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  stackExtra: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackExtraText: {
    color: colors.fg,
    fontWeight: '700',
  },
  completionCopy: {
    flex: 1,
    minWidth: 0,
  },
  completionHeadline: {
    color: colors.fg,
    fontWeight: '700',
    fontSize: 13,
  },
  completionHint: {
    color: 'rgba(232,238,247,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
});

function AnimatedAchievementCard({ item, index, navigation }: {
  item: Achievement;
  index: number;
  navigation: any;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: index * 80,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const cover = item.manual.cover_url ?? undefined;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate('Home', {
            screen: 'ManualDetail',
            params: { manualId: item.manual.id, title: item.manual.title },
          })
        }
        style={styles.cardInner}
        accessibilityLabel={`Completed manual: ${item.manual.title}`}
        accessibilityHint="Tap to review this completed manual"
      >
        {cover ? (
          <ImageBackground
            source={{ uri: cover }}
            style={styles.cover}
            resizeMode="cover"
            imageStyle={{ borderRadius: radius.xl }}
          />
        ) : (
          <View style={styles.cover} />
        )}

        <View style={styles.meta}>
          <View>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.manual.title}
            </Text>

            {item.manual.description ? (
              <Text style={styles.desc} numberOfLines={2}>
                {item.manual.description}
              </Text>
            ) : null}
          </View>

          <View style={styles.footerColumn}>
            <View style={styles.whenRow}>
              <Ionicons name="time-outline" size={12} color="rgba(232,238,247,0.65)" />
              <Text style={styles.when}>{formatWhen(item.acked_at)}</Text>
            </View>
            <Pressable
              onPress={() =>
                navigation.navigate('Home', {
                  screen: 'ManualDetail',
                  params: { manualId: item.manual.id, title: item.manual.title },
                })
              }
              style={styles.reviewBtn}
              accessibilityLabel="Review manual"
            >
              <Ionicons name="open-outline" size={16} color={colors.fg} />
              <Text style={styles.reviewText}>Review</Text>
            </Pressable>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}