import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme/tokens';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon = 'document-text-outline',
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
        <View style={styles.container}>
        <View style={styles.iconContainer}>
            <Ionicons name={icon} size={56} color="rgba(232,238,247,0.5)" />
        </View>
        <Text style={styles.title}>{title}</Text>
        {message && <Text style={styles.message}>{message}</Text>}
        {onAction && actionLabel && (
            <Pressable
            onPress={onAction}
            style={({ pressed }) => [
                styles.actionButton,
                pressed && { opacity: 0.8 },
            ]}
            accessibilityLabel={actionLabel}
            accessibilityRole="button"
            >
            <Text style={styles.actionText}>{actionLabel}</Text>
            </Pressable>
        )}
        </View>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    marginBottom: spacing.lg,
    opacity: 0.6,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.fg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: 'rgba(232,238,247,0.65)',
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  actionButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  actionText: {
    color: colors.fg,
    fontSize: 15,
    fontWeight: '600',
  },
});