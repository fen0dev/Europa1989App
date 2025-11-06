import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import ManualsScreen from '../screens/ManualScreen';
import ManualDetailScreen from '../screens/ManualDetailScreen';
import SectionScreen from '../screens/SectionScreen';
import ArticleScreen from '../screens/ArticleScreen';
import PDFViewerScreen from '../screens/PDFViewerScreen';
import AdminStack from './admin/AdminStack'; // 
import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function ManualsStack() {
  return (
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
        name="Manuals"
        component={ManualsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ManualDetail"
        component={ManualDetailScreen}
        options={({ route }) => ({ title: route.params?.title?.trim() ?? 'Manual' })}
      />
      <Stack.Screen name="PDF" component={PDFViewerScreen} options={({ route }) => ({ title: route.params?.title ?? 'PDF' })} />
      <Stack.Screen name="Section" component={SectionScreen} options={({ route }) => ({ title: route.params?.title ?? 'Section' })} />
      <Stack.Screen name="Article" component={ArticleScreen} options={({ route }) => ({ title: route.params?.title ?? 'Article' })} />

      <Stack.Screen 
        name="AdminStack" 
        component={AdminStack}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}