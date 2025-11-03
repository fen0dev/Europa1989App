import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';
import { useNotificationPreferences } from '../../hooks/notifications/useNotificationPreferences';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useToast } from '../notification/toast/Toast';
import * as Haptics from 'expo-haptics';

export default function NotificationPreferences() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const topPad = Math.max(headerHeight, insets.top) + 15;
  const toast = useToast();

  const { preferences, isLoading, updatePreferences, isUpdating } = useNotificationPreferences();

  const handleToggle = (key: keyof typeof preferences, value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updatePreferences({ [key]: value });
    toast.showToast(`${value ? 'Enabled' : 'Disabled'} ${key.replace('_', ' ')}`, 'info');
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.fg} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.header, { marginTop: topPad }]}>
        <Text style={styles.headerTitle}>Notification Preferences</Text>
        <Text style={styles.headerSubtitle}>
          Choose what notifications you want to receive
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General</Text>
        
        <PreferenceRow
          label="Push Notifications"
          description="Receive push notifications on your device"
          value={preferences.push_enabled}
          onValueChange={(value) => handleToggle('push_enabled', value)}
          disabled={isUpdating}
        />

        <PreferenceRow
          label="In-App Notifications"
          description="Show notifications while using the app"
          value={preferences.in_app_enabled}
          onValueChange={(value) => handleToggle('in_app_enabled', value)}
          disabled={isUpdating}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity</Text>
        
        <PreferenceRow
          label="Note Reactions"
          description="When someone reacts to your notes"
          value={preferences.note_reactions}
          onValueChange={(value) => handleToggle('note_reactions', value)}
          disabled={isUpdating || !preferences.push_enabled}
          icon="heart-outline"
        />

        <PreferenceRow
          label="Note Replies"
          description="When someone replies to your notes"
          value={preferences.note_replies}
          onValueChange={(value) => handleToggle('note_replies', value)}
          disabled={isUpdating || !preferences.push_enabled}
          icon="chatbubble-outline"
        />

        <PreferenceRow
          label="Manual Completions"
          description="When colleagues complete manuals"
          value={preferences.manual_completions}
          onValueChange={(value) => handleToggle('manual_completions', value)}
          disabled={isUpdating || !preferences.push_enabled}
          icon="checkmark-circle-outline"
        />

        <PreferenceRow
          label="Question Answers"
          description="When someone answers your questions"
          value={preferences.question_answers}
          onValueChange={(value) => handleToggle('question_answers', value)}
          disabled={isUpdating || !preferences.push_enabled}
          icon="help-circle-outline"
        />

        <PreferenceRow
          label="Team Activities"
          description="Team progress and achievements"
          value={preferences.team_activities}
          onValueChange={(value) => handleToggle('team_activities', value)}
          disabled={isUpdating || !preferences.push_enabled}
          icon="people-outline"
        />
      </View>
    </ScrollView>
  );
}

function PreferenceRow({
  label,
  description,
  value,
  onValueChange,
  disabled,
  icon,
}: {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  icon?: string;
}) {
  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      disabled={disabled}
      style={({ pressed }) => [
        styles.preferenceRow,
        disabled && styles.preferenceRowDisabled,
        pressed && !disabled && { opacity: 0.8 },
      ]}
    >
      <View style={styles.preferenceContent}>
        {icon && (
          <View style={styles.iconContainer}>
            <Ionicons name={icon as any} size={20} color={value ? colors.primary : 'rgba(255,255,255,0.4)'} />
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={[styles.preferenceLabel, disabled && styles.preferenceLabelDisabled]}>
            {label}
          </Text>
          <Text style={[styles.preferenceDescription, disabled && styles.preferenceDescriptionDisabled]}>
            {description}
          </Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: 'rgba(255,255,255,0.1)', true: colors.primary + '40' }}
        thumbColor={value ? colors.primary : 'rgba(255,255,255,0.3)'}
        ios_backgroundColor="rgba(255,255,255,0.1)"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl * 2,
  },
  header: {
    marginBottom: spacing.xl,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.fg,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(232,238,247,0.6)',
    lineHeight: 22,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(232,238,247,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: spacing.sm,
  },
  preferenceRowDisabled: {
    opacity: 0.5,
  },
  preferenceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  preferenceLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.fg,
  },
  preferenceLabelDisabled: {
    color: 'rgba(232,238,247,0.4)',
  },
  preferenceDescription: {
    fontSize: 13,
    color: 'rgba(232,238,247,0.6)',
    lineHeight: 18,
  },
  preferenceDescriptionDisabled: {
    color: 'rgba(232,238,247,0.3)',
  },
});

