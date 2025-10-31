import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing, shadow } from '../../theme/tokens';
import { useToast } from '../../screens/notification/toast/Toast';
import { useFormValidation, validators } from '../../hooks/useFormValidation';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const { errors, touched, validateField, markTouched, hasError } = useFormValidation({
    email: [validators.required('Email is required'), validators.email()],
  });

  async function onSubmit() {
    markTouched('email');
    if (!validateField('email', email)) {
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { 
      redirectTo: 'europa://reset' 
    });
    setLoading(false);
    
    if (error) {
      toast.showToast('Error sending email. Please try again.', 'error');
      return;
    }
    
    toast.showToast('Password reset email sent!', 'success');
    setSent(true);
  }

  return (
    <LinearGradient colors={['#0b0f14', '#0b0f14']} style={styles.root}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.root}
      >
        <View style={styles.container}>
          <Pressable 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.fg} />
          </Pressable>

          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <BlurView intensity={30} tint="dark" style={styles.iconBlur}>
                <Ionicons name="lock-closed-outline" size={48} color={'rgba(49, 222, 202, 0.46)'} />
              </BlurView>
            </View>

            <Text style={styles.title}>Password Recovery</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>

            {sent ? (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={64} color={colors.success} />
                <Text style={styles.successTitle}>Email Sent!</Text>
                <Text style={styles.successText}>
                  Check your inbox and follow the link we've sent to reset your password.
                </Text>
                <Pressable
                  onPress={() => navigation.goBack()}
                  style={styles.backToLoginBtn}
                >
                  <Text style={styles.backToLoginText}>Back to Login</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.inputWrap}>
                  <Ionicons name="mail-outline" size={18} color={colors.fg} style={{ marginRight: 8, opacity: 0.7 }} />
                  <TextInput
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                      if (touched.email) validateField('email', v);
                    }}
                    onBlur={() => markTouched('email')}
                    placeholder="Your email address"
                    placeholderTextColor="rgba(232,238,247,0.5)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                    accessibilityLabel="Email input"
                    accessibilityHint="Enter your email address to receive password reset link"
                  />
                </View>
                {hasError('email') && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}

                <Pressable
                  disabled={!email || loading || hasError('email')}
                  onPress={onSubmit}
                  style={({ pressed }) => [
                    styles.btn,
                    (!email || loading || hasError('email')) && styles.btnDisabled,
                    pressed && { opacity: 0.85 },
                  ]}
                  accessibilityLabel="Send reset link"
                  accessibilityState={{ disabled: !email || loading }}
                >
                  <LinearGradient
                    colors={(!email || loading || hasError('email')) 
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
                        <Ionicons name="send-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.btnText}>Send Reset Link</Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, paddingHorizontal: spacing.xl },
  backButton: {
    marginTop: 50,
    marginBottom: spacing.lg,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
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
    marginBottom: spacing.xs,
  },
  input: {
    flex: 1,
    color: colors.fg,
    fontSize: 16,
  },
  errorText: {
    color: colors.error,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    fontSize: 13,
    marginLeft: spacing.md,
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
  successTitle: {
    color: colors.fg,
    fontSize: 24,
    fontWeight: '700',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  successText: {
    color: 'rgba(232,238,247,0.7)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  backToLoginBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  backToLoginText: {
    color: colors.fg,
    fontSize: 15,
    fontWeight: '600',
  },
});