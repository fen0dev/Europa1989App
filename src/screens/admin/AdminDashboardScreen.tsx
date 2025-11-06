import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getAllManualsAdmin } from '../../api/admin';
import { colors, radius, spacing } from '../../theme/tokens';
import type { AdminStackParamList } from '../../navigation/admin/AdminStack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';

type AdminManual = {
  id: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  updated_at: string;
  manual_version?: number;
  pdf_path?: string | null;
  pdf_url?: string | null;
  published?: boolean;
};

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminDashboard'>;

export default function AdminDashboardScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + spacing.xl + 7;

  const { data: manuals, isLoading } = useQuery({
    queryKey: ['admin-manuals'],
    queryFn: getAllManualsAdmin,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  const adminManuals = (manuals ?? []) as AdminManual[];
  const publishedCount = adminManuals.filter(m => m.published).length || 0;
  const draftCount = adminManuals.length - publishedCount;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.subtitle, { paddingTop: topPad }]}>Manage manuals, content and moderation</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="book" size={24} color="#4FFFBF" />
          <Text style={styles.statValue}>{adminManuals.length}</Text>
          <Text style={styles.statLabel}>Total Manuals</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={24} color="#4FFFBF" />
          <Text style={styles.statValue}>{publishedCount}</Text>
          <Text style={styles.statLabel}>Published</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="document-text" size={24} color="#FFD166" />
          <Text style={styles.statValue}>{draftCount}</Text>
          <Text style={styles.statLabel}>Drafts</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('AdminManualList')}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="book-outline" size={24} color="#4FFFBF" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Manual Management</Text>
            <Text style={styles.actionSubtitle}>
              Create, edit and publish manuals
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('AdminManualEdit', {})}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="add-circle-outline" size={24} color="#4FFFBF" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>New Manual</Text>
            <Text style={styles.actionSubtitle}>
              Create a new manual from scratch
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Manuals</Text>
        {adminManuals.length > 0 ? (
          adminManuals.slice(0, 5).map((manual) => (
            <TouchableOpacity
              key={manual.id}
              style={styles.manualCard}
              onPress={() =>
                navigation.navigate('AdminManualEdit', { manualId: manual.id })
              }
            >
              <View style={styles.manualInfo}>
                <Text style={styles.manualTitle}>{manual.title}</Text>
                <View style={styles.manualMeta}>
                  <View style={[styles.badge, manual.published ? styles.badgePublished : styles.badgeDraft]}>
                    <Text style={styles.badgeText}>
                      {manual.published ? 'Published' : 'Draft'}
                    </Text>
                  </View>
                  <Text style={styles.manualVersion}>
                    Version {manual.manual_version || 1}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyText}>No manuals yet</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.xl,
    paddingTop: spacing.xl + 20,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.fg,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(232,238,247,0.7)',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.fg,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(232,238,247,0.6)',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.fg,
    marginBottom: spacing.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(79, 255, 191, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.fg,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 13,
    color: 'rgba(232,238,247,0.6)',
  },
  manualCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  manualInfo: {
    flex: 1,
  },
  manualTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.fg,
    marginBottom: 6,
  },
  manualMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgePublished: {
    backgroundColor: 'rgba(79, 255, 191, 0.15)',
  },
  badgeDraft: {
    backgroundColor: 'rgba(255, 209, 102, 0.15)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.fg,
  },
  manualVersion: {
    fontSize: 12,
    color: 'rgba(232,238,247,0.5)',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: 'rgba(232,238,247,0.5)',
  },
});
