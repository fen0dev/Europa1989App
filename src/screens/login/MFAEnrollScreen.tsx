import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing, shadow } from '../../theme/tokens';
import { useToast } from '../../screens/notification/toast/Toast';

export default function MFAEnrollScreen({ navigation }: any) {
  const [uri, setUri] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      try {
        const res = await supabase.auth.mfa.enroll({ 
          factorType: 'totp', 
          friendlyName: 'Personal Device' 
        });
        if ((res as any).error) {
          toast.showToast('Error activating MFA. Please try again.', 'error');
          navigation.goBack();
          return;
        }
        const u = (res as any).data?.totp?.uri;
        const id = (res as any).data?.id;
        setUri(u);
        setFactorId(id);
      } catch (error) {
        toast.showToast('Failed to initialize MFA', 'error');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function verify() {
    if (!factorId) {
      toast.showToast('MFA not ready. Please wait.', 'error');
      return;
    }
    if (code.length !== 6) {
      toast.showToast('Please enter a 6-digit code', 'error');
      return;
    }

    setVerifying(true);
    // Durante l'enroll, verify non richiede challengeId
    const { error } = await supabase.auth.mfa.verify({ factorId, code, challengeId: '' as string });
    setVerifying(false);
    
    if (error) {
      toast.showToast('Invalid code. Please try again.', 'error');
      return;
    }
    
    toast.showToast('MFA enabled successfully!', 'success');
    setTimeout(() => navigation.replace('Login'), 1000);
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
                <Ionicons name="shield-checkmark-outline" size={48} color={colors.primary} />
              </BlurView>
            </View>

            <Text style={styles.title}>Enable Two-Factor Authentication</Text>
            <Text style={styles.subtitle}>
              Scan the QR code with your authenticator app to set up MFA
            </Text>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Generating QR code...</Text>
              </View>
            ) : uri ? (
              <>
                <View style={styles.qrContainer}>
                  <BlurView intensity={20} tint="dark" style={styles.qrBlur}>
                    <QRCode value={uri} size={200} />
                  </BlurView>
                </View>

                <View style={styles.instructions}>
                  <Text style={styles.instructionTitle}>How to set up:</Text>
                  <View style={styles.instructionStep}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>1</Text>
                    </View>
                    <Text style={styles.instructionText}>
                      Open Google Authenticator, 1Password, or any TOTP app
                    </Text>
                  </View>
                  <View style={styles.instructionStep}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>2</Text>
                    </View>
                    <Text style={styles.instructionText}>
                      Scan the QR code above
                    </Text>
                  </View>
                  <View style={styles.instructionStep}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>3</Text>
                    </View>
                    <Text style={styles.instructionText}>
                      Enter the 6-digit code from your app below
                    </Text>
                  </View>
                </View>

                <View style={styles.inputWrap}>
                  <Ionicons name="keypad-outline" size={18} color={colors.fg} style={{ marginRight: 8, opacity: 0.7 }} />
                  <TextInput
                    value={code}
                    onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    keyboardType="number-pad"
                    maxLength={6}
                    style={styles.input}
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
                        <Text style={styles.btnText}>Verify & Enable</Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </>
            ) : (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
                <Text style={styles.errorText}>Failed to generate QR code</Text>
                <Pressable
                  onPress={() => navigation.goBack()}
                  style={styles.backBtn}
                >
                  <Text style={styles.backBtnText}>Go Back</Text>
                </Pressable>
              </View>
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
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.md,
  },
  loadingText: {
    color: 'rgba(232,238,247,0.7)',
    fontSize: 15,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  qrBlur: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    ...shadow.ios,
    ...shadow.android,
  },
  instructions: {
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  instructionTitle: {
    color: colors.fg,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  instructionText: {
    flex: 1,
    color: 'rgba(232,238,247,0.8)',
    fontSize: 14,
    lineHeight: 20,
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
    marginBottom: spacing.lg,
  },
  input: {
    flex: 1,
    color: colors.fg,
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 8,
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
  errorContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
    textAlign: 'center',
  },
  backBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  backBtnText: {
    color: colors.fg,
    fontSize: 15,
    fontWeight: '600',
  },
});