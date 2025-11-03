import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { colors, radius, spacing } from '../../theme/tokens';
import { useNotifications } from '../../hooks/notifications/useNotifications';
import { Notification, NOTIFICATION_ICONS, NOTIFICATION_COLORS } from '../../lib/notifiations/notificationTypes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';
import { SkeletonLoader } from '../loader/SkeletonLoader';
import EmptyState from '../error/EmptyState';
import * as Haptics from 'expo-haptics';

export default function NotificationCenter() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const topPad = Math.max(headerHeight, insets.top) + 15;
  
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  
  const {
    notifications,
    total,
    isLoading,
    error,
    refetch,
    markAsRead,
    markAllRead,
  } = useNotifications({
    unreadOnly: filter === 'unread',
    limit: 50,
  });

  const handleMarkAllRead = () => {
    markAllRead();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification data
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

  const unreadCount = notifications.filter(n => !n.read).length;

  if (isLoading && notifications.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { marginTop: topPad }]}>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonLoader key={i} width="100%" height={80} borderRadius={radius.lg} style={{ marginBottom: spacing.md }} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { marginTop: topPad }]}>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSubtitle}>
              {unreadCount} {unreadCount === 1 ? 'unread' : 'unread'}
            </Text>
          )}
        </View>
        {unreadCount > 0 && (
          <Pressable
            onPress={handleMarkAllRead}
            style={styles.markAllBtn}
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        )}
      </View>

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
      />
    </View>
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
    backgroundColor: colors.bg,
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
    backgroundColor: 'rgba(79, 140, 255, 0.15)',
    borderColor: 'rgba(79, 140, 255, 0.3)',
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
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl * 2,
  },
  loadingContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
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
    backgroundColor: 'rgba(79, 140, 255, 0.08)',
    borderColor: 'rgba(79, 140, 255, 0.2)',
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
    backgroundColor: colors.primary,
    marginTop: 6,
  },
});