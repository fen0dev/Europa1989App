import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../theme/tokens';
import { useToast } from '../../screens/notification/toast/Toast';

export default function MFAVerifyScreen({ navigation, route }: any) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      try {
        const { data: list, error: listErr } = await supabase.auth.mfa.listFactors();
        if (listErr) {
          toast.showToast('Error loading MFA factors', 'error');
          navigation.goBack();
          return;
        }
        const totp = list?.totp?.find((f: any) => f.status === 'verified');
        if (!totp) {
          toast.showToast('No active MFA device found', 'error');
          navigation.replace('MFAEnroll');
          return;
        }
        setFactorId(totp.id);
        const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId: totp.id });
        if (chErr) {
          toast.showToast('Unable to generate challenge', 'error');
          navigation.goBack();
          return;
        }
        setChallengeId(challenge?.id ?? null);
      } catch (error) {
        toast.showToast('Failed to initialize MFA verification', 'error');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function verify() {
    if (!factorId || !challengeId) {
      toast.showToast('MFA not ready. Please wait.', 'error');
      return;
    }
    if (code.length !== 6) {
      toast.showToast('Please enter a 6-digit code', 'error');
      return;
    }

    setVerifying(true);
    const { data, error } = await supabase.auth.mfa.verify({ factorId, code, challengeId });
    setVerifying(false);
    
    if (error) {
      toast.showToast('Invalid code. Please try again.', 'error');
      return;
    }
    
    toast.showToast('Login successful!', 'success');
    // Navigation sarà gestita automaticamente dall'App.tsx quando la sessione è valida
  }

  return (
    <LinearGradient colors={['#0b0f14', '#0b0f14']} style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
        <View style={styles.container}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Preparing verification...</Text>
            </View>
          ) : (
            <>
              <View style={styles.iconContainer}>
                <BlurView intensity={30} tint="dark" style={styles.iconBlur}>
                  <Ionicons name="shield-checkmark-outline" size={48} color={colors.primary} />
                </BlurView>
              </View>

              <Text style={styles.title}>Verify Your Identity</Text>
              <Text style={styles.subtitle}>
                Enter the 6-digit code from your authenticator app
              </Text>

              <View style={styles.inputWrap}>
                <Ionicons name="keypad-outline" size={18} color={colors.fg} style={{ marginRight: 8, opacity: 0.7 }} />
                <TextInput
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  keyboardType="number-pad"
                  maxLength={6}
                  style={styles.input}
                  autoFocus
                  accessibilityLabel="MFA verification code"
                  accessibilityHint="Enter the 6-digit code from your authenticator app"
                />
              </View>

              <Pressable
                onPress={verify}
                disabled={verifying || code.length !== 6}
                style={({ pressed }) => [
                  styles.btn,
                  (verifying || code.length !== 6) && styles.btnDisabled,
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityLabel="Verify MFA code"
                accessibilityState={{ disabled: verifying || code.length !== 6 }}
              >
                <LinearGradient
                  colors={(verifying || code.length !== 6)
                    ? ['rgba(95, 255, 191, 0.23)', 'rgba(23, 205, 81, 0.23)']
                    : ['rgba(95, 255, 191, 0.5)', 'rgba(23, 205, 81, 0.5)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.btnInner}
                >
                  {verifying ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.btnText}>Verify</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: 100,
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
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
    height: 64,
    marginBottom: spacing.lg,
  },
  input: {
    flex: 1,
    color: colors.fg,
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: 12,
    textAlign: 'center',
  },
  btn: {
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
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});