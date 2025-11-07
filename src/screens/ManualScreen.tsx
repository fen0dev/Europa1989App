import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
  Animated,
} from 'react-native';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Manual>);
import { useQuery, useQueries } from '@tanstack/react-query';
import { getManuals, type Manual, getMyManualAcks, getManualCompletions, type ManualCompletion } from '../api/manuals';
import { getManualNotesStats } from '../api/notes';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, shadow } from '../theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { ManualCardSkeleton } from '../screens/loader/SkeletonLoader';
import ErrorView from '../screens/error/ErrorView';
import EmptyState from '../screens/error/EmptyState';
import NotificationButton from '../components/NotificationButton';

type Props = NativeStackScreenProps<RootStackParamList, 'Manuals'>;

export default function ManualsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const topPad = Math.max(headerHeight, insets.top) + 15;

  const manualsQ = useQuery({ queryKey: ['manuals'], queryFn: getManuals, staleTime: 30_000 });
  const acksQ = useQuery({ queryKey: ['my-acks'], queryFn: () => getMyManualAcks(), staleTime: 30_000 });
  const completionsQ = useQuery({ queryKey: ['manual-completions'], queryFn: () => getManualCompletions(), staleTime: 30_000 });

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!manualsQ.isLoading && manualsQ.data) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [manualsQ.isLoading, manualsQ.data]);

  // Query per ottenere le stats delle note per ogni manuale visibile
  const data = (manualsQ.data ?? []) as Manual[];
  const acks = acksQ.data ?? {};
  const visible = data.filter(m => (acks[m.id] ?? 0) < (m.manual_version ?? 1));

  const notesStatsQueries = useQueries({
    queries: visible.map((manual) => ({
      queryKey: ['manual-notes-stats', manual.id],
      queryFn: () => getManualNotesStats(manual.id),
      staleTime: 30_000,
    })),
  });

  // Crea una mappa delle stats delle note per manualId
  const notesStatsMap = React.useMemo(() => {
    const map: Record<string, { total: number; helpful_count: number }> = {};
    notesStatsQueries.forEach((query, index) => {
      if (query.data && visible[index]) {
        map[visible[index].id] = {
          total: query.data.total,
          helpful_count: query.data.helpful_count,
        };
      }
    });
    return map;
  }, [notesStatsQueries, visible]);

  if (manualsQ.isLoading || acksQ.isLoading || completionsQ.isLoading) {
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
                <Text style={styles.title}>Manuals</Text>
                <Text style={styles.subtitle}>Your latest documents and guides.</Text>
              </View>
            </View>
            <NotificationButton />
          </View>
        }
      />
    );
  }

  if (manualsQ.error) {
    return (
      <ErrorView
        title="Unable to Load Manuals"
        message="There was an error loading your manuals. Please check your connection and try again."
        onRetry={() => {
          manualsQ.refetch();
          acksQ.refetch();
        }}
        retryLabel="Retry"
      />
    );
  }

  const completionsError = completionsQ.error;
  const completionsMap = completionsError ? {} : (completionsQ.data ?? {});

  const renderItem = ({ item, index }: { item: Manual; index: number }) => {
    const targetVersion = item.manual_version ?? 1;
    const ackVersion = acks[item.id] ?? 0;
    const completed = ackVersion >= targetVersion;
    const notesStats = notesStatsMap[item.id];

    return (
      <AnimatedCard
        index={index}
        item={item}
        completed={completed}
        completions={completionsMap[item.id] ?? []}
        notesStats={notesStats}
        scrollY={scrollY}
        onPress={() => {
          requestAnimationFrame(() =>
            navigation.push('ManualDetail', { manualId: item.id, title: item.title })
          );
        }}
      />
    );
  };

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <AnimatedFlatList
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={[styles.list, { paddingTop: topPad }]}
        data={visible}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        refreshControl={
          <RefreshControl
            tintColor="#fff"
            refreshing={manualsQ.isRefetching || acksQ.isRefetching}
            onRefresh={() => {
              manualsQ.refetch();
              acksQ.refetch();
              notesStatsQueries.forEach(q => q.refetch());
            }}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.headerText}>
                <Text style={styles.title}>Manuals</Text>
                <Text style={styles.subtitle}>Your latest documents and guides.</Text>
              </View>
            </View>
            <NotificationButton />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="No Manuals Available"
            message="All your manuals have been completed. Check back later for new content!"
          />
        }
      />
    </Animated.View>
  );
}

function AnimatedCard({ 
  index, 
  item, 
  completed, 
  completions, 
  notesStats,
  scrollY,
  onPress
}: {
  index: number;
  item: Manual;
  completed: boolean;
  completions: ManualCompletion[];
  notesStats?: { total: number; helpful_count: number };
  scrollY: Animated.Value;
  onPress: () => void;
}) {
  const scaleAnim = React.useRef(new Animated.Value(0.95)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
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
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim,{
        toValue: 1,
        delay: index * 50,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: opacityAnim,
          transform: [{ scale: Animated.multiply(scaleAnim, cardScale) }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={{ borderRadius: radius.xl }}
        accessibilityLabel={`Manual: ${item.title}`}
        accessibilityHint="Tap to view manual details"
      >
        <View style={styles.cardInner}>
          {/* Cover hero section con parallax effect */}
          <View style={styles.coverWrapFull}>
            {item.cover_url ? (
              <>
                <Animated.Image 
                  source={{ uri: item.cover_url }} 
                  style={[
                    StyleSheet.absoluteFillObject,
                    {
                      transform: [{ translateY: imageTranslateY }],
                      opacity: imageOpacity,
                    }
                  ]} 
                  resizeMode="cover" 
                />
                {/* Overlay gradient più elegante */}
                <LinearGradient
                  colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.1)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
              </>
            ) : (
              <LinearGradient
                colors={['rgba(79, 255, 191, 0.15)', 'rgba(79, 140, 255, 0.1)', 'rgba(79, 255, 229, 0.05)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
            )}
            
            {/* Badge status in alto a destra */}
            <View style={styles.coverBadge}>
              {completed ? (
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statusBadgeGradient}
                >
                  <Ionicons name="trophy" size={16} color="#fff" />
                </LinearGradient>
              ) : (
                <View style={styles.statusBadge}>
                  <Ionicons name="book-outline" size={16} color={colors.fg} />
                </View>
              )}
            </View>

            {/* Title overlay sulla cover */}
            <View style={styles.coverTitleOverlay}>
              <Text style={styles.coverTitle} numberOfLines={2}>
                {item.title}
              </Text>
            </View>

            {!item.cover_url && (
              <View style={styles.coverIcon}>
                <Ionicons name="document-text-outline" size={32} color="rgba(255,255,255,0.8)" />
              </View>
            )}
          </View>

          {/* Statistiche integrate nella card */}
          <View style={styles.statsSection}>
            <View style={styles.statsRow}>
              {/* Completions */}
              <View style={styles.statItem}>
                <View style={styles.statIconWrapper}>
                  <Ionicons name="people-outline" size={16} color="#4FFFA4" />
                </View>
                <Text style={styles.statValue}>{completions.length}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>

              {/* Notes stats se disponibili */}
              {notesStats && notesStats.total > 0 && (
                <View style={styles.statItem}>
                  <View style={styles.statIconWrapper}>
                    <Ionicons name="document-text-outline" size={16} color="#4F8CFF" />
                  </View>
                  <Text style={styles.statValue}>{notesStats.total}</Text>
                  <Text style={styles.statLabel}>Notes</Text>
                  {notesStats.helpful_count > 0 && (
                    <View style={styles.helpfulBadge}>
                      <Ionicons name="heart" size={10} color="#fff" />
                      <Text style={styles.helpfulBadgeText}>{notesStats.helpful_count}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Version badge */}
              <View style={styles.statItem}>
                <View style={styles.statIconWrapper}>
                  <Ionicons name="layers-outline" size={16} color="#FFC107" />
                </View>
                <Text style={styles.statValue}>v{item.manual_version || 1}</Text>
                <Text style={styles.statLabel}>Version</Text>
              </View>
            </View>
          </View>

          {/* Sezione completamenti con design migliorato */}
          {completions.length > 0 && (
            <View style={styles.completionSection}>
              <CompletionAvatarRow completions={completions} />
            </View>
          )}

          {/* Meta info migliorata */}
          <View style={styles.meta}>
            {item.description ? (
              <Text style={styles.desc} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}

            <View style={styles.rowBottom}>
              <View style={styles.tag}>
                <Ionicons name="time-outline" size={12} color="rgba(232,238,247,0.8)" />
                <Text style={styles.tagText}>Recently updated</Text>
              </View>

              <View style={styles.actionIndicator}>
                <Text style={styles.actionText}>View details</Text>
                <Ionicons name="arrow-forward" size={14} color="#4FFFBF" />
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function CompletionAvatarRow({ completions }: { completions: ManualCompletion[] }) {
  if (!completions.length) {
    return (
      <View style={styles.completionPlaceholder}>
        <View style={styles.placeholderStack}>
          {[0, 1, 2].map((idx) => (
            <View
              key={idx}
              style={[
                styles.placeholderBubble,
                idx > 0 && { marginLeft: spacing.sm },
              ]}
            >
              <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.35)" />
            </View>
          ))}
        </View>
  
        <View style={styles.placeholderCopy}>
          <Text style={styles.placeholderTitle}>No completions (yet!)</Text>
          <Text style={styles.placeholderSubtitle}>
            Be the first: your avatar will appear here.
          </Text>
        </View>
      </View>
    );
  }

  const top = completions.slice(0, 6);
  const extra = completions.length - top.length;

  return (
    <View style={styles.completionRow}>
      <View style={styles.avatarStack}>
        {top.map((completion, idx) => (
          <View
            key={`${completion.manual_id}-${completion.user_id}`}
            style={[
              styles.stackItem,
              idx > 0 && { marginLeft: 25, zIndex: top.length - idx },
            ]}
          >
            <LinearGradient
              colors={['#4FFFA4', '#65E1FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.stackBubble}
            >
              {completion.avatar_url ? (
                <Image source={{ uri: completion.avatar_url }} style={styles.stackAvatar} />
              ) : (
                <View style={[styles.stackAvatar, styles.stackAvatarFallback]}>
                  <Ionicons name="person" size={16} color="rgba(255,255,255,0.7)" />
                </View>
              )}
            </LinearGradient>
          </View>
        ))}
        {extra > 0 && (
          <View style={[styles.stackItem, { marginLeft: -18 }]}>
            <View style={styles.stackExtra}>
              <Text style={styles.stackExtraText}>{`+${extra}`}</Text>
            </View>
          </View>
        )}
      </View>
      <View style={styles.completionCopy}>
        <Text style={styles.completionHeadline}>
          {top[0]?.display_name ? `${top[0].display_name} completed` : 'Completed by colleagues'}
        </Text>
        <Text style={styles.completionHint}>Swipe to see who was the fastest.</Text>
      </View>
    </View>
  );
}

const BORDER = 'rgba(255,255,255,0.12)';
const GLASS = 'rgba(255,255,255,0.06)';

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
  title: { fontSize: 30, fontWeight: '800', color: colors.fg },
  subtitle: { color: 'rgba(232,238,247,0.7)', marginTop: 6 },
  card: {
    marginBottom: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    ...shadow.ios,
    ...shadow.android,
  },
  cardInner: { flexDirection: 'column', alignItems: 'stretch' },
  coverWrapFull: {
    width: '100%',
    height: 200,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
    position: 'relative',
  },
  coverBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
  },
  statusBadgeGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.ios,
    ...shadow.android,
  },
  statusBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
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
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  coverWrap: {
    width: 84,
    height: 84,
    margin: spacing.md,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  coverIcon: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
    position: 'relative',
  },
  statIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statValue: {
    color: colors.fg,
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    color: 'rgba(232,238,247,0.7)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  helpfulBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 2,
  },
  helpfulBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  completionSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  notesBadgeSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  notesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(79, 140, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(79, 140, 255, 0.25)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  notesBadgeText: {
    color: '#4f8cff',
    fontSize: 12,
    fontWeight: '600',
  },
  helpfulIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: spacing.xs,
    paddingLeft: spacing.xs,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(79, 140, 255, 0.25)',
  },
  helpfulCount: {
    color: '#FF6B6B',
    fontSize: 11,
    fontWeight: '700',
  },
  meta: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: 8 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { color: colors.fg, fontSize: 16, fontWeight: '700', flexShrink: 1, paddingRight: 6 },
  desc: { 
    color: 'rgba(232,238,247,0.75)',
    fontSize: 14,
    lineHeight: 20,
  },
  rowBottom: { 
    marginTop: 8,
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  actionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: '#4FFFBF',
    fontSize: 12,
    fontWeight: '600',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  tagText: { color: 'rgba(232,238,247,0.9)', fontSize: 12, fontWeight: '700' },
  completedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  completedText: { color: colors.fg, fontWeight: '700', fontSize: 12 },
  readPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(2, 102, 45, 0.35)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  readText: { color: colors.fg, fontWeight: '700', fontSize: 12 },
  completionBubbleWrap: {
    alignItems: 'center',
    width: 56,
  },
  completionBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  completionAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  completionAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  completionCaption: {
    marginTop: 4,
    fontSize: 10,
    color: 'rgba(232,238,247,0.8)',
    textAlign: 'center',
  },
  completionExtra: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  completionExtraText: {
    color: colors.fg,
    fontWeight: '700',
  },
  placeholderBubbles: {
    flexDirection: 'row',
    gap: spacing.xs,
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
  
  // Nuovi stili per le note fuori dalla card
  notesOutsideSection: {
    marginTop: -14,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  notesOutsideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(79, 255, 229, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(79, 255, 232, 0.25)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
  notesOutsideText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});