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
  Image,
} from 'react-native';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Achievement>);
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

  const scrollY = useRef(new Animated.Value(0)).current;

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
    <AnimatedFlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[styles.list, { paddingTop: topPad }]}
      data={achievements}
      keyExtractor={(a) => a.manual.id}
      scrollEventThrottle={16}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true }
      )}
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
          scrollY={scrollY}
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
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  coverWrapFull: {
    width: '100%',
    height: 200,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
    position: 'relative',
  },
  trophyBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
  },
  trophyGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.ios,
    ...shadow.android,
  },
  coverTitleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  coverTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  coverIcon: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementInfo: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: 12,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(79, 255, 164, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(79, 255, 164, 0.3)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  completedText: {
    color: '#4FFFA4',
    fontSize: 13,
    fontWeight: '700',
  },
  whenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm - 8,
    paddingVertical: 6,
  },
  when: { 
    color: 'rgba(232,238,247,0.85)', 
    fontSize: 12,
    fontWeight: '600',
  },
  desc: { 
    color: 'rgba(232,238,247,0.75)',
    fontSize: 14,
    lineHeight: 20,
  },
  reviewBtn: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  reviewBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  reviewText: { 
    color: colors.fg, 
    fontWeight: '700', 
    fontSize: 14,
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

function AnimatedAchievementCard({ item, index, navigation, scrollY }: {
  item: Achievement;
  index: number;
  navigation: any;
  scrollY: Animated.Value;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  const CARD_HEIGHT = 200;
  const CARD_SPACING = spacing.lg;
  const HEADER_HEIGHT = 100;
  
  const inputRange = [
    -1,
    0,
    (CARD_HEIGHT + CARD_SPACING) * index + HEADER_HEIGHT,
    (CARD_HEIGHT + CARD_SPACING) * (index + 1) + HEADER_HEIGHT,
  ];

  const imageTranslateY = scrollY.interpolate({
    inputRange,
    outputRange: [0, 0, -50, -100],
    extrapolate: 'clamp',
  });

  const imageOpacity = scrollY.interpolate({
    inputRange,
    outputRange: [1, 1, 0.7, 0.3],
    extrapolate: 'clamp',
  });

  const cardScale = scrollY.interpolate({
    inputRange,
    outputRange: [1, 1, 0.98, 0.96],
    extrapolate: 'clamp',
  });

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
            { scale: Animated.multiply(scaleAnim, cardScale) },
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
        style={{ borderRadius: radius.xl }}
        accessibilityLabel={`Completed manual: ${item.manual.title}`}
        accessibilityHint="Tap to review this completed manual"
      >
        <View style={styles.cardInner}>
          {/* Hero section con parallax effect */}
          <View style={styles.coverWrapFull}>
            {cover ? (
              <>
                <Animated.Image
                  source={{ uri: cover }}
                  style={[
                    StyleSheet.absoluteFillObject,
                    {
                      transform: [{ translateY: imageTranslateY }],
                      opacity: imageOpacity,
                    }
                  ]}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.2)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
              </>
            ) : (
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 165, 0, 0.15)', 'rgba(255, 215, 0, 0.1)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
            )}

            {/* Trophy badge prominente */}
            <View style={styles.trophyBadge}>
              <LinearGradient
                colors={['#FFD700', '#FFA500', '#FF8C00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.trophyGradient}
              >
                <Ionicons name="trophy" size={24} color="#fff" />
              </LinearGradient>
            </View>

            {/* Title overlay sulla cover */}
            <View style={styles.coverTitleOverlay}>
              <Text style={styles.coverTitle} numberOfLines={2}>
                {item.manual.title}
              </Text>
            </View>

            {!cover && (
              <View style={styles.coverIcon}>
                <Ionicons name="trophy" size={40} color="rgba(255, 215, 0, 0.8)" />
              </View>
            )}
          </View>

          {/* Achievement info section */}
          <View style={styles.achievementInfo}>
            <View style={styles.achievementHeader}>
              <View style={styles.completedBadge}>
                <Ionicons name="checkmark-circle" size={18} color="#4FFFA4" />
                <Text style={styles.completedText}>Completed</Text>
              </View>
              <View style={styles.whenBadge}>
                <Ionicons name="time-outline" size={14} color="rgba(232,238,247,0.85)" />
                <Text style={styles.when}>{formatWhen(item.acked_at)}</Text>
              </View>
            </View>

            {item.manual.description ? (
              <Text style={styles.desc} numberOfLines={2}>
                {item.manual.description}
              </Text>
            ) : null}

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
              <LinearGradient
                colors={['rgba(79, 255, 191, 0.2)', 'rgba(108, 159, 154, 0.2)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.reviewBtnGradient}
              >
                <Ionicons name="open-outline" size={16} color={colors.fg} />
                <Text style={styles.reviewText}>Review</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}