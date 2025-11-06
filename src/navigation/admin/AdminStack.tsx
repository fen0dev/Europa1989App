import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import AdminDashboardScreen from '../../screens/admin/AdminDashboardScreen';
import AdminManualListScreen from '../../screens/admin/AdminManualListScreen';
import AdminManualEditScreen from '../../screens/admin/AdminManualEditScreen';
import AdminSectionEditScreen from '../../screens/admin/AdminSectionEditScreen';
import AdminArticleEditScreen from '../../screens/admin/AdminArticleEditScreen';
import AdminQuestionsScreen from '../../screens/admin/AdminQuestionScreen';
import AdminNotesModerationScreen from '../../screens/admin/AdminModerationScreen';
import { BlurView } from 'expo-blur';
import { colors } from '../../theme/tokens';
import { useAdmin } from '../../hooks/useAdmin';
import { useNavigation } from '@react-navigation/native';

export type AdminStackParamList = {
  AdminDashboard: undefined;
  AdminManualList: undefined;
  AdminManualEdit: { manualId?: string };
  AdminSectionEdit: { sectionId?: string; manualId: string };
  AdminArticleEdit: { articleId?: string; sectionId: string };
  AdminQuestions: { manualId: string };
  AdminNotesModeration: { manualId: string };
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

// Componente guard per proteggere lo stack admin
function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAdmin();
  const navigation = useNavigation();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigation.goBack();
    }
  }, [isAdmin, loading, navigation]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" size="large" />
        <Text style={styles.loadingText}>Checking permissions...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Access denied</Text>
        <Text style={styles.errorSubtext}>You don't have permission to access this area</Text>
      </View>
    );
  }

  return <>{children}</>;
}

export default function AdminStack() {
  return (
    <AdminGuard>
      <Stack.Navigator
        screenOptions={{
          headerTransparent: true,
          headerBlurEffect: 'systemUltraThinMaterialDark',
          headerBackground: () => <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />,
          headerTintColor: '#fff',
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen
          name="AdminDashboard"
          component={AdminDashboardScreen}
          options={{ title: 'Admin Dashboard' }}
        />
        <Stack.Screen
          name="AdminManualList"
          component={AdminManualListScreen}
          options={{ title: 'Manual Management' }}
        />
        <Stack.Screen
          name="AdminManualEdit"
          component={AdminManualEditScreen}
          options={{ title: 'Edit Manual' }}
        />
        <Stack.Screen
          name="AdminSectionEdit"
          component={AdminSectionEditScreen}
          options={{ title: 'Edit Section' }}
        />
        <Stack.Screen
          name="AdminArticleEdit"
          component={AdminArticleEditScreen}
          options={{ title: 'Edit Article' }}
        />
        <Stack.Screen
          name="AdminQuestions"
          component={AdminQuestionsScreen}
          options={{ title: 'Quiz Questions' }}
        />
        <Stack.Screen
          name="AdminNotesModeration"
          component={AdminNotesModerationScreen}
          options={{ title: 'Notes Moderation' }}
        />
      </Stack.Navigator>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  loadingText: {
    marginTop: 16,
    color: colors.fg,
    fontSize: 16,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorSubtext: {
    color: 'rgba(232,238,247,0.6)',
    fontSize: 14,
  },
});
