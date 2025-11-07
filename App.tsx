// App.tsx

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StatusBar } from 'react-native';
import { DarkTheme, NavigationContainer, Theme } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootTabs from './src/navigation/tabs/RootTabs';
import AuthNavigator from './src/navigation/auth/AuthNavigator';
import OnboardingScreen from './src/screens/onboarding/OnboardingScreen';
import { supabase } from './src/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import linking from './src/navigation/linking';
import { colors } from './src/theme/tokens';
import { ToastProvider } from './src/screens/notification/toast/Toast';
import { hasCompletedOnboarding } from './src/hooks/onboarding/onboardingStorage';
import { queryClient } from './src/lib/queryClient';
import { notificationService } from './src/lib/notifiations/notificationService';

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

type AppState = 'loading' | 'onboarding' | 'authenticated' | 'unauthenticated';

// Componente interno che può accedere al QueryClient tramite hook
function AuthenticatedApp() {
  useEffect(() => {
    // Initialize notification service when authenticated
    notificationService.initialize(queryClient, {
      onUnreadCountChanged: (count) => {
        // Update badge count if needed
        console.log('Unread notifications:', count);
      },
    });

    return () => {
      notificationService.cleanup();
    };
  }, []);

  return <RootTabs />;
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [appState, setAppState] = useState<AppState>('loading');

  useEffect(() => {
    // Inizializza sessione
    let mounted = true;
    
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);

      if (data.session) {
        hasCompletedOnboarding().then((hasSeen) => {
            if (!mounted) return;
            setAppState(hasSeen ? 'authenticated' : 'onboarding');
        }).catch(() => {
            if (!mounted) return;
            setAppState('onboarding');
        });
      } else {
          setAppState('unauthenticated');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (!mounted) return;
      
      setSession(s);
      
      if (s) {
        // Utente autenticato: controlla onboarding una sola volta
        try {
          const hasSeenOnboarding = await hasCompletedOnboarding();
          setAppState(hasSeenOnboarding ? 'authenticated' : 'onboarding');
        } catch (error) {
          // In caso di errore, assumi che l'onboarding non sia stato completato
          setAppState('onboarding');
        }
      } else {
        setAppState('unauthenticated');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleOnboardingComplete = () => {
    setAppState('authenticated');
  };

  if (appState === 'loading') {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0f14' }}>
            <ActivityIndicator color="#fff" />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (appState === 'onboarding') {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <OnboardingScreen onComplete={handleOnboardingComplete} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <NavigationContainer linking={linking} theme={theme}>
              {appState === 'authenticated' ? <AuthenticatedApp /> : <AuthNavigator />}
            </NavigationContainer>
            <StatusBar barStyle="light-content" />
          </ToastProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}