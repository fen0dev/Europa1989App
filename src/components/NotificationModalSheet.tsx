import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Pressable,
  FlatList,
  RefreshControl,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, radius, spacing } from '../theme/tokens';
import { useNotifications } from '../hooks/notifications/useNotifications';
import { useNotificationPreferences } from '../hooks/notifications/useNotificationPreferences';
import { Notification, NOTIFICATION_ICONS, NOTIFICATION_COLORS } from '../lib/notifiations/notificationTypes';
import { SkeletonLoader } from '../screens/loader/SkeletonLoader';
import EmptyState from '../screens/error/EmptyState';
import { useToast } from '../screens/notification/toast/Toast';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;
const DRAG_THRESHOLD = 100;

interface NotificationModalSheetProps {
  visible: boolean;
  onClose: () => void;
}

type ViewMode = 'notifications' | 'preferences';

export default function NotificationModalSheet({ visible, onClose }: NotificationModalSheetProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const toast = useToast();
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pan = useRef(new Animated.ValueXY()).current;

  const [viewMode, setViewMode] = React.useState<ViewMode>('notifications');
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all');
  
  const {
    notifications,
    isLoading,
    refetch,
    markAsRead,
    markAllRead,
  } = useNotifications({
    unreadOnly: filter === 'unread',
    limit: 50,
  });

  const { preferences, isLoading: prefsLoading, updatePreferences, isUpdating } = useNotificationPreferences();

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          pan.setValue({ x: 0, y: gestureState.dy });
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > DRAG_THRESHOLD) {
          closeSheet();
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: SHEET_HEIGHT,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      // Reset view mode when closing
      setViewMode('notifications');
    }
  }, [visible]);

  const closeSheet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pan.setValue({ x: 0, y: 0 });
    onClose();
  };

  const handleMarkAllRead = () => {
    markAllRead();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Navigate based on notification data
    closeSheet();
    
    const data = notification.data;
    if (data?.manualId) {
      navigation.navigate('Home', {
        screen: 'ManualDetail',
        params: { manualId: data.manualId },
      });
    } else if (data?.articleId) {
      navigation.navigate('Home', {
        screen: 'Article',
        params: { articleId: data.articleId },
      });
    }
  };

  const handleTogglePreference = (key: keyof typeof preferences, value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updatePreferences({ [key]: value });
    toast.showToast(`${value ? 'Enabled' : 'Disabled'} ${key.replace('_', ' ')}`, 'info');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const sheetStyle = {
    transform: [
      {
        translateY: Animated.add(
          translateY,
          pan.y
        ),
      },
    ],
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeSheet}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity,
            },
          ]}
        >
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        </Animated.View>

        {/* Backdrop press handler */}
        <Pressable
          style={styles.backdropPressable}
          onPress={closeSheet}
        />

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              height: SHEET_HEIGHT,
              paddingBottom: insets.bottom,
              ...sheetStyle,
            },
          ]}
          {...panResponder.panHandlers}
        >
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          
          {/* Handle bar */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>
                {viewMode === 'notifications' ? 'Notifications' : 'Preferences'}
              </Text>
              {viewMode === 'notifications' && unreadCount > 0 && (
                <Text style={styles.headerSubtitle}>
                  {unreadCount} {unreadCount === 1 ? 'unread' : 'unread'}
                </Text>
              )}
            </View>
            <View style={styles.headerActions}>
              {viewMode === 'notifications' && unreadCount > 0 && (
                <Pressable
                  onPress={handleMarkAllRead}
                  style={styles.markAllBtn}
                >
                  <Text style={styles.markAllText}>Mark all read</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setViewMode(viewMode === 'notifications' ? 'preferences' : 'notifications');
                }}
                style={styles.settingsBtn}
              >
                <Ionicons 
                  name={viewMode === 'notifications' ? 'settings-outline' : 'notifications-outline'} 
                  size={20} 
                  color={colors.fg} 
                />
              </Pressable>
            </View>
          </View>

          {/* Content */}
          {viewMode === 'notifications' ? (
            <>
              {/* Filter */}
              <View style={styles.filterContainer}>
                <Pressable
                  onPress={() => setFilter('all')}
                  style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
                >
                  <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                    All
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setFilter('unread')}
                  style={[styles.filterBtn, filter === 'unread' && styles.filterBtnActive]}
                >
                  <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
                    Unread
                  </Text>
                  {unreadCount > 0 && filter === 'all' && (
                    <View style={styles.filterBadge}>
                      <Text style={styles.filterBadgeText}>{unreadCount}</Text>
                    </View>
                  )}
                </Pressable>
              </View>

              {/* Notifications List */}
              {isLoading && notifications.length === 0 ? (
                <View style={styles.loadingContainer}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <SkeletonLoader key={i} width="100%" height={80} borderRadius={radius.lg} style={{ marginBottom: spacing.md }} />
                  ))}
                </View>
              ) : (
                <FlatList
                  data={notifications}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <NotificationItem
                      notification={item}
                      onPress={() => handleNotificationPress(item)}
                      onMarkRead={() => markAsRead(item.id)}
                    />
                  )}
                  contentContainerStyle={styles.listContent}
                  ListEmptyComponent={
                    <EmptyState
                      icon="notifications-outline"
                      title={filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                      message={filter === 'unread' 
                        ? 'You\'re all caught up!' 
                        : 'You\'ll see notifications here when colleagues interact with your content.'}
                    />
                  }
                  refreshControl={
                    <RefreshControl
                      tintColor="#fff"
                      refreshing={false}
                      onRefresh={() => refetch()}
                    />
                  }
                  showsVerticalScrollIndicator={false}
                />
              )}
            </>
          ) : (
            /* Preferences View */
            <ScrollView 
              style={styles.preferencesContainer}
              contentContainerStyle={styles.preferencesContent}
              showsVerticalScrollIndicator={false}
            >
              {prefsLoading ? (
                <View style={styles.preferencesLoading}>
                  <ActivityIndicator color={colors.fg} size="large" />
                </View>
              ) : (
                <>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>General</Text>
                    
                    <PreferenceRow
                      label="Push Notifications"
                      description="Receive push notifications on your device"
                      value={preferences.push_enabled}
                      onValueChange={(value) => handleTogglePreference('push_enabled', value)}
                      disabled={isUpdating}
                    />

                    <PreferenceRow
                      label="In-App Notifications"
                      description="Show notifications while using the app"
                      value={preferences.in_app_enabled}
                      onValueChange={(value) => handleTogglePreference('in_app_enabled', value)}
                      disabled={isUpdating}
                    />
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Activity</Text>
                    
                    <PreferenceRow
                      label="Note Reactions"
                      description="When someone reacts to your notes"
                      value={preferences.note_reactions}
                      onValueChange={(value) => handleTogglePreference('note_reactions', value)}
                      disabled={isUpdating || !preferences.push_enabled}
                      icon="heart-outline"
                    />

                    <PreferenceRow
                      label="Note Replies"
                      description="When someone replies to your notes"
                      value={preferences.note_replies}
                      onValueChange={(value) => handleTogglePreference('note_replies', value)}
                      disabled={isUpdating || !preferences.push_enabled}
                      icon="chatbubble-outline"
                    />

                    <PreferenceRow
                      label="Manual Completions"
                      description="When colleagues complete manuals"
                      value={preferences.manual_completions}
                      onValueChange={(value) => handleTogglePreference('manual_completions', value)}
                      disabled={isUpdating || !preferences.push_enabled}
                      icon="checkmark-circle-outline"
                    />

                    <PreferenceRow
                      label="Question Answers"
                      description="When someone answers your questions"
                      value={preferences.question_answers}
                      onValueChange={(value) => handleTogglePreference('question_answers', value)}
                      disabled={isUpdating || !preferences.push_enabled}
                      icon="help-circle-outline"
                    />

                    <PreferenceRow
                      label="Team Activities"
                      description="Team progress and achievements"
                      value={preferences.team_activities}
                      onValueChange={(value) => handleTogglePreference('team_activities', value)}
                      disabled={isUpdating || !preferences.push_enabled}
                      icon="people-outline"
                    />
                  </View>
                </>
              )}
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
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
          <View style={styles.preferenceIconContainer}>
            <Ionicons name={icon as any} size={20} color={value ? 'rgba(79, 255, 205, 0.48)' : 'rgba(255,255,255,0.4)'} />
          </View>
        )}
        <View style={styles.preferenceTextContainer}>
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
        trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgb(60, 66, 63)' + '40' }}
        thumbColor={value ? 'rgb(18, 122, 83)' : 'rgba(255,255,255,0.3)'}
        ios_backgroundColor="rgba(255,255,255,0.1)"
      />
    </Pressable>
  );
}

function NotificationItem({
  notification,
  onPress,
  onMarkRead,
}: {
  notification: Notification;
  onPress: () => void;
  onMarkRead: () => void;
}) {
  const icon = NOTIFICATION_ICONS[notification.type];
  const color = NOTIFICATION_COLORS[notification.type];
  const timeAgo = formatTimeAgo(notification.created_at);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.notificationItem,
        !notification.read && styles.notificationItemUnread,
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={styles.notificationContent}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.notificationTitle} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.notificationBody} numberOfLines={2}>
            {notification.body}
          </Text>
          <Text style={styles.notificationTime}>{timeAgo}</Text>
        </View>

        {!notification.read && (
          <View style={styles.unreadDot} />
        )}
      </View>
    </Pressable>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.fg,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(232,238,247,0.6)',
    marginTop: 4,
  },
  markAllBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  markAllText: {
    color: colors.fg,
    fontSize: 13,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  filterBtnActive: {
    backgroundColor: 'rgba(24, 147, 71, 0.25)',
    borderColor: 'rgba(79, 255, 205, 0.22)',
  },
  filterText: {
    color: 'rgba(232,238,247,0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.fg,
  },
  filterBadge: {
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  loadingContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl * 2,
  },
  preferencesContainer: {
    flex: 1,
  },
  preferencesContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl * 2,
  },
  preferencesLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xl * 2,
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
  preferenceIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  preferenceTextContainer: {
    flex: 1,
    gap: 2,
  },
  preferenceLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.fg,
  },
  preferenceLabelDisabled: {
    color: 'rgba(232, 247, 235, 0.4)',
  },
  preferenceDescription: {
    fontSize: 13,
    color: 'rgba(232,238,247,0.6)',
    lineHeight: 18,
  },
  preferenceDescriptionDisabled: {
    color: 'rgba(232,238,247,0.3)',
  },
  notificationItem: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  notificationItemUnread: {
    backgroundColor: 'rgba(24, 147, 71, 0.25)',
    borderColor: 'rgba(79, 255, 205, 0.22)',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    gap: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  notificationTitle: {
    color: colors.fg,
    fontSize: 15,
    fontWeight: '700',
  },
  notificationBody: {
    color: 'rgba(232,238,247,0.75)',
    fontSize: 14,
    lineHeight: 20,
  },
  notificationTime: {
    color: 'rgba(232,238,247,0.5)',
    fontSize: 12,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(79, 255, 205, 0.22)',
    marginTop: 6,
  },
});
