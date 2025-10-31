import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing, shadow } from '../../theme/tokens';
import { useToast } from '../../screens/notification/toast/Toast';
import { PasswordStrength } from './PasswordStrength';
import ErrorView from '../error/ErrorView';

export default function ResetPasswordScreen({ navigation }: any) {
  const [ready, setReady] = useState(false);
  const [ticketErr, setTicketErr] = useState<string | null>(null);
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [showP1, setShowP1] = useState(false);
  const [showP2, setShowP2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      const url = await Linking.getInitialURL();
      const parsed = url ? Linking.parse(url) : { queryParams: {} as any };
      const code = (parsed as any).queryParams?.code;
      if (!code) {
        setTicketErr('Invalid or missing reset link');
        return;
      }
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setTicketErr('Reset link expired. Please request a new one.');
        return;
      }
      setReady(true);
    })();
  }, []);

  async function onSubmit() {
    if (p1.length < 10) {
      toast.showToast('Password must be at least 10 characters', 'error');
      return;
    }
    if (p1 !== p2) {
      toast.showToast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: p1 });
    setLoading(false);
    
    if (error) {
      toast.showToast('Error updating password. Please try again.', 'error');
      return;
    }
    
    toast.showToast('Password updated successfully!', 'success');
    setOk(true);
    setTimeout(() => navigation.replace('Login'), 1500);
  }

  if (ticketErr) {
    return (
      <View style={styles.root}>
        <ErrorView
          title="Reset Link Invalid"
          message={ticketErr}
          onRetry={() => navigation.replace('Login')}
          retryLabel="Back to Login"
        />
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.root}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Validating reset link...</Text>
        </View>
      </View>
    );
  }

  return (
    <LinearGradient colors={['#0b0f14', '#0b0f14']} style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <View style={styles.iconContainer}>
              <BlurView intensity={30} tint="dark" style={styles.iconBlur}>
                <Ionicons name="key-outline" size={48} color={colors.primary} />
              </BlurView>
            </View>

            <Text style={styles.title}>Set New Password</Text>
            <Text style={styles.subtitle}>
              Choose a strong password with at least 10 characters
            </Text>

            {ok ? (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={64} color={colors.success} />
                <Text style={styles.successText}>Password updated successfully!</Text>
              </View>
            ) : (
              <>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.fg} style={{ marginRight: 8, opacity: 0.7 }} />
                  <TextInput
                    value={p1}
                    onChangeText={setP1}
                    placeholder="New password"
                    placeholderTextColor="rgba(232,238,247,0.5)"
                    secureTextEntry={!showP1}
                    style={styles.input}
                    accessibilityLabel="New password input"
                    accessibilityHint="Enter your new password"
                  />
                  <Pressable
                    onPress={() => setShowP1(!showP1)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel={showP1 ? 'Hide password' : 'Show password'}
                  >
                    <Ionicons
                      name={showP1 ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={colors.fg}
                      style={{ opacity: 0.7 }}
                    />
                  </Pressable>
                </View>

                <PasswordStrength password={p1} confirmPassword={p2} />

                <View style={{ height: spacing.md }} />

                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.fg} style={{ marginRight: 8, opacity: 0.7 }} />
                  <TextInput
                    value={p2}
                    onChangeText={setP2}
                    placeholder="Confirm password"
                    placeholderTextColor="rgba(232,238,247,0.5)"
                    secureTextEntry={!showP2}
                    style={styles.input}
                    accessibilityLabel="Confirm password input"
                    accessibilityHint="Confirm your new password"
                  />
                  <Pressable
                    onPress={() => setShowP2(!showP2)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel={showP2 ? 'Hide password' : 'Show password'}
                  >
                    <Ionicons
                      name={showP2 ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={colors.fg}
                      style={{ opacity: 0.7 }}
                    />
                  </Pressable>
                </View>

                <Pressable
                  onPress={onSubmit}
                  disabled={loading || p1.length < 10 || p1 !== p2}
                  style={({ pressed }) => [
                    styles.btn,
                    (loading || p1.length < 10 || p1 !== p2) && styles.btnDisabled,
                    pressed && { opacity: 0.85 },
                  ]}
                  accessibilityLabel="Save new password"
                  accessibilityState={{ disabled: loading || p1.length < 10 || p1 !== p2 }}
                >
                  <LinearGradient
                    colors={(loading || p1.length < 10 || p1 !== p2)
                      ? ['rgba(95, 255, 191, 0.23)', 'rgba(23, 205, 81, 0.23)']
                      : ['rgba(95, 255, 191, 0.5)', 'rgba(23, 205, 81, 0.5)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.btnInner}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.btnText}>Save Password</Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { flexGrow: 1 },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: 60,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: 'rgba(232,238,247,0.7)',
    fontSize: 15,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconBlur: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(79, 140, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(79, 140, 255, 0.3)',
  },
  title: {
    color: colors.fg,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(232,238,247,0.7)',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.md,
    height: 52,
  },
  input: {
    flex: 1,
    color: colors.fg,
    fontSize: 16,
  },
  btn: {
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: radius.lg,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  successText: {
    color: colors.success,
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});