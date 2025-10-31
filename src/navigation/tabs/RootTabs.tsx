import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ManualsStack from '../ManualStack';
import ProfileScreen from '../../screens/ProfileScreen';
import AchievementScreen from '../../screens/AchievementScreen';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/tokens';
import GlassTabBar from './GlassTabBar';

const Tab = createBottomTabNavigator();

function Placeholder({ label }: { label: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

export default function RootTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
      }}
      tabBar={(props) => <GlassTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={ManualsStack} />
      <Tab.Screen name="Search" component={AchievementScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  text: { color: 'rgba(232,238,247,0.8)' },
});