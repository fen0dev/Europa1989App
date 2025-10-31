import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, radius, spacing } from '../../theme/tokens';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = radius.md,
  style,
}: SkeletonLoaderProps) {
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
}

export function ManualCardSkeleton() {
  return (
    <View style={styles.card}>
      <SkeletonLoader width={84} height={84} borderRadius={radius.xl} />
      <View style={styles.content}>
        <SkeletonLoader width="80%" height={18} style={{ marginBottom: spacing.xs }} />
        <SkeletonLoader width="60%" height={14} style={{ marginBottom: spacing.sm }} />
        <View style={styles.tags}>
          <SkeletonLoader width={60} height={24} borderRadius={999} />
          <SkeletonLoader width={70} height={24} borderRadius={999} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  tags: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
});