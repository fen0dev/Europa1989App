import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius, spacing, shadow } from '../../theme/tokens';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../screens/notification/toast/Toast';
import { useFormValidation, validators } from '../../hooks/useFormValidation';
import { AuthStackScreenProps } from '../../navigation/types';
import { handleApiError, ErrorCode } from '../../lib/errors';

type Props = AuthStackScreenProps<'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const toast = useToast();

  const { errors, touched, validateField, markTouched, hasError } = useFormValidation({
    email: [validators.required('Email is required'), validators.email()],
    password: [validators.required('Password is required')],
  });

  async function onLogin() {
    markTouched('email');
    markTouched('password');
    
    if (!validateField('email', email) || !validateField('password', password)) {
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (data?.session) {
        toast.showToast('Welcome back!', 'success');
        return;
      }

      // Gestione MFA
      if (error && (error.message?.toLowerCase().includes('mfa') || error.status === 403)) {
        await handleMFAFlow();
        return;
      }

      // Altri errori
      const appError = handleApiError(error);
      toast.showToast(appError.userMessage || 'Invalid email or password', 'error');
    } catch (err: any) {
      const appError = handleApiError(err);
      toast.showToast(appError.userMessage || 'Login failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleMFAFlow() {
    try {
      const { data: list, error: listErr } = await supabase.auth.mfa.listFactors();
      
      if (listErr) {
        const appError = handleApiError(listErr);
        toast.showToast(appError.userMessage || 'MFA error. Please try again.', 'error');
        return;
      }

      const totp = list?.totp?.find((f) => f.status === 'verified');

      if (!totp) {
        navigation.replace('MFAEnroll');
        return;
      }

      const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ 
        factorId: totp.id 
      });

      if (chErr || !challenge?.id) {
        const appError = handleApiError(chErr);
        toast.showToast(appError.userMessage || 'MFA not available', 'error');
        return;
      }

      navigation.replace('MFAVerify', { 
        factorId: totp.id, 
        challengeId: challenge.id 
      });
    } catch (err: any) {
      const appError = handleApiError(err);
      toast.showToast(appError.userMessage || 'MFA setup failed', 'error');
    }
  }

  return (
    <LinearGradient colors={['#0b0f14', '#0b0f14']} style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>Europa 1989 Manuals</Text>
          <Text style={styles.subtitle}>Standard, safety and service — All in one app</Text>
        </View>

        <View style={styles.center}>
          <BlurView intensity={50} tint="dark" style={styles.card}>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={colors.fg} style={{ marginRight: 8, opacity: 0.7 }} />
              <TextInput
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (touched.email) validateField('email', v);
                }}
                onBlur={() => markTouched('email')}
                placeholder="Business Email"
                placeholderTextColor="rgba(232,238,247,0.5)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                accessibilityLabel="Email input"
                accessibilityHint="Enter your business email address"
              />
            </View>
            {hasError('email') && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}

            <View style={{ height: 12 }} />

            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.fg} style={{ marginRight: 8, opacity: 0.7 }} />
              <TextInput
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  if (touched.password) validateField('password', v);
                }}
                onBlur={() => markTouched('password')}
                placeholder="Password"
                placeholderTextColor="rgba(232,238,247,0.5)"
                secureTextEntry={!showPassword}
                style={styles.input}
                accessibilityLabel="Password input"
                accessibilityHint="Enter your password"
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Ionicons 
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                  size={18} 
                  color={colors.fg} 
                  style={{ opacity: 0.7 }} 
                />
              </Pressable>
            </View>
            {hasError('password') && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}

            <Pressable 
              onPress={onLogin} 
              disabled={loading || !email || !password} 
              style={({ pressed }) => [
                styles.btn, 
                (loading || !email || !password) && styles.btnDisabled,
                pressed && { opacity: 0.85 }
              ]}
              accessibilityLabel="Login button"
              accessibilityState={{ disabled: loading || !email || !password }}
            >
              <LinearGradient 
                colors={loading || !email || !password ? ['rgba(95, 255, 191, 0.23)', 'rgba(23, 205, 81, 0.23)'] : ['rgba(95, 255, 191, 0.5)', 'rgba(23, 205, 81, 0.5)']} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 1 }} 
                style={styles.btnInner}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Login</Text>}
              </LinearGradient>
            </Pressable>

            <Pressable 
              onPress={() => navigation.navigate('ForgotPassword')}
              accessibilityLabel="Forgot password link"
            >
                <Text style={{ color: 'rgba(232,238,247,0.8)', textAlign: 'center', marginTop: 12 }}>
                    Password forgotten?
                </Text>
            </Pressable>

            <Text style={styles.hint}>Access restricted to staff.</Text>
          </BlurView>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: 80 },
  title: { color: colors.fg, fontSize: 28, fontWeight: '800', letterSpacing: 0.2 },
  subtitle: { color: 'rgba(232,238,247,0.7)', fontSize: 14, marginTop: 8, lineHeight: 20 },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
  card: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    ...shadow.ios,
    ...shadow.android,
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
  input: { flex: 1, color: colors.fg, fontSize: 16 },
  btn: { marginTop: spacing.lg, borderRadius: radius.lg, overflow: 'hidden' },
  btnDisabled: { opacity: 0.6 },
  btnInner: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: radius.lg },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  errorText: { color: colors.error, marginTop: spacing.xs, fontSize: 13, marginLeft: spacing.md },
  hint: { color: 'rgba(232,238,247,0.55)', textAlign: 'center', marginTop: spacing.lg, fontSize: 12 },
});