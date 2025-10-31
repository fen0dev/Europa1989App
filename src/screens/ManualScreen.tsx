import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Image,
  Animated,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getManuals, type Manual, getMyManualAcks } from '../api/manuals';
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

type Props = NativeStackScreenProps<RootStackParamList, 'Manuals'>;

export default function ManualsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const topPad = Math.max(headerHeight, insets.top) + 15;

  const manualsQ = useQuery({ queryKey: ['manuals'], queryFn: getManuals, staleTime: 30_000 });
  const acksQ = useQuery({ queryKey: ['my-acks'], queryFn: () => getMyManualAcks(), staleTime: 30_000 });

  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!manualsQ.isLoading && manualsQ.data) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [manualsQ.isLoading, manualsQ.data]);

  if (manualsQ.isLoading || acksQ.isLoading) {
    return (
      <ScrollView
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={[styles.list, { paddingTop: topPad }]}
      >
        <View style={styles.header}>
          <LinearGradient
            colors={['rgba(79, 255, 164, 0.75)', 'rgba(79, 255, 208, 0.25)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.badge}
          >
            <Ionicons name="book-outline" size={22} color="#fff" />
          </LinearGradient>
          <Text style={styles.title}>Manuals</Text>
          <Text style={styles.subtitle}>Your latest documents and guides.</Text>
        </View>
        {[1, 2, 3].map((i) => (
          <ManualCardSkeleton key={i} />
        ))}
      </ScrollView>
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

  const data = (manualsQ.data ?? []) as Manual[];
  const acks = acksQ.data ?? {};
  const visible = data.filter(m => (acks[m.id] ?? 0) < (m.manual_version ?? 1));

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <ScrollView
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={[styles.list, { paddingTop: topPad }]}
        refreshControl={
          <RefreshControl
            tintColor="#fff"
            refreshing={manualsQ.isRefetching || acksQ.isRefetching}
            onRefresh={() => {
              manualsQ.refetch();
              acksQ.refetch();
            }}
          />
        }
      >
        <View style={styles.header}>
          <LinearGradient
            colors={['rgba(79, 255, 164, 0.75)', 'rgba(79, 255, 208, 0.25)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.badge}
          >
            <Ionicons name="book-outline" size={22} color="#fff" />
          </LinearGradient>
          <Text style={styles.title}>Manuals</Text>
          <Text style={styles.subtitle}>Your latest documents and guides.</Text>
        </View>

        {visible.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="No Manuals Available"
            message="All your manuals have been completed. Check back later for new content!"
          />
        ) : (
          visible.map((item, index) => {
            const targetVersion = item.manual_version ?? 1;
            const ackVersion = acks[item.id] ?? 0;
            const completed = ackVersion >= targetVersion;

            return (
              <AnimatedCard
                key={item.id}
                index={index}
                item={item}
                completed={completed}
                onPress={() => {
                  requestAnimationFrame(() =>
                    navigation.push('ManualDetail', { manualId: item.id, title: item.title })
                  );
                }}
              />
            );
          })
        )}
      </ScrollView>
    </Animated.View>
  );
}

function AnimatedCard({ index, item, completed, onPress}: {
  index: number;
  item: Manual;
  completed: boolean;
  onPress: () => void;
}) {
  const scaleAnim = React.useRef(new Animated.Value(0.95)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

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
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={{ borderRadius: radius.xl }}
        accessibilityLabel={`Manual: ${item.title}`}
        accessibilityHint="Tap to view manual details"
      >
        <View style={styles.cardInner}>
          <View style={styles.coverWrap}>
            {item.cover_url ? (
              <Image source={{ uri: item.cover_url }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            ) : null}
            <LinearGradient
              colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.04)']}
              style={StyleSheet.absoluteFillObject}
            />
            {!item.cover_url ? (
              <View style={styles.coverIcon}>
                <Ionicons name="document-text-outline" size={26} color="rgba(255,255,255,0.75)" />
              </View>
            ) : null}
          </View>

          <View style={styles.meta}>
            <View style={styles.rowTop}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
            </View>

            {item.description ? (
              <Text style={styles.desc} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}

            <View style={styles.rowBottom}>
              <View style={styles.tag}>
                <Ionicons name="time-outline" size={14} color="rgba(232,238,247,0.85)" />
                <Text style={styles.tagText}>Updated</Text>
              </View>

              {completed ? (
                <View style={styles.completedPill}>
                  <Ionicons name="trophy" size={14} color="#ffd369" />
                  <Text style={styles.completedText}>Completed</Text>
                </View>
              ) : (
                <View style={styles.readPill}>
                  <Ionicons name="book-outline" size={14} color={colors.fg} />
                  <Text style={styles.readText}>Read</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const BORDER = 'rgba(255,255,255,0.12)';
const GLASS = 'rgba(255,255,255,0.06)';

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl * 2 },
  header: { marginBottom: spacing.lg },
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
  cardInner: { flexDirection: 'row', alignItems: 'stretch' },
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
  meta: { flex: 1, paddingRight: spacing.md, paddingVertical: spacing.md, gap: 6 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { color: colors.fg, fontSize: 16, fontWeight: '700', flexShrink: 1, paddingRight: 6 },
  desc: { color: 'rgba(232,238,247,0.75)' },
  rowBottom: { marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  tagText: { color: 'rgba(232,238,247,0.85)', fontSize: 12, fontWeight: '700' },
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
});