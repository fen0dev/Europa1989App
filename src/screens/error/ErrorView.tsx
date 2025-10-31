import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';

interface ErrorViewProps {
    title?: string;
    message: string;
    onRetry: () => void;
    retryLabel?: string;
}

export default function ErrorView({
    title = 'Error',
    message,
    onRetry,
    retryLabel = 'Retry',
}: ErrorViewProps) {
    return (
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {onRetry && (
            <Pressable
              onPress={onRetry}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && { opacity: 0.8 },
              ]}
              accessibilityLabel={retryLabel}
              accessibilityRole="button"
            >
              <Ionicons name="refresh-outline" size={18} color={colors.fg} />
              <Text style={styles.retryText}>{retryLabel}</Text>
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
      padding: spacing.xl,
      backgroundColor: colors.bg,
    },
    iconContainer: {
      marginBottom: spacing.md,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.fg,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    message: {
      fontSize: 15,
      color: 'rgba(232,238,247,0.7)',
      textAlign: 'center',
      marginBottom: spacing.lg,
      lineHeight: 22,
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
      borderRadius: radius.xl,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    retryText: {
      color: colors.fg,
      fontSize: 15,
      fontWeight: '600',
    },
});