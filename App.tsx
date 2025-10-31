import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StatusBar } from 'react-native';
import { DarkTheme, NavigationContainer, Theme } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootTabs from './src/navigation/tabs/RootTabs';
import AuthNavigator from './src/navigation/auth/AuthNavigator';
import { supabase } from './src/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import linking from './src/navigation/linking';
import { colors } from './src/theme/tokens';
import { ToastProvider } from './src/screens/notification/toast/Toast';

const queryClient = new QueryClient();

const theme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: 'transparent',
    text: colors.fg,
    border: 'transparent',
    primary: colors.primary,
  },
};

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0f14' }}>
          <ActivityIndicator color="#fff" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <NavigationContainer linking={linking} theme={theme}>
            {session ? <RootTabs /> : <AuthNavigator />}
          </NavigationContainer>
          <StatusBar barStyle="light-content" />
        </ToastProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}