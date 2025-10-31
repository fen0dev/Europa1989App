import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme/tokens';

interface PasswordStrengthProps {
  password: string;
  confirmPassword?: string;
}

export function PasswordStrength({ password, confirmPassword }: PasswordStrengthProps) {
  if (!password) return null;

  const checks = {
    length: password.length >= 10,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    match: confirmPassword ? password === confirmPassword : true,
  };

  const score = Object.values(checks).filter(Boolean).length;
  const strength = score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong';
  const strengthColor =
    strength === 'weak' ? colors.error : strength === 'medium' ? colors.warning : colors.success;

  return (
        <View style={styles.container}>
        <View style={styles.barContainer}>
            <View
                style={[
                    styles.bar,
                    {
                    width: `${(score / 6) * 100}%`,
                    backgroundColor: strengthColor,
                    },
                ]}
            />
        </View>
        <View style={styles.checks}>
            {confirmPassword && (
            <Text
                style={[
                styles.check,
                checks.match ? styles.checkPassed : styles.checkFailed,
                ]}
            >
                {checks.match ? '✓' : '✗'} Passwords match
            </Text>
            )}
            <Text style={[styles.check, checks.length ? styles.checkPassed : styles.checkFailed]}>
            {checks.length ? '✓' : '✗'} At least 10 characters
            </Text>
            <Text style={[styles.check, checks.uppercase ? styles.checkPassed : styles.checkFailed]}>
            {checks.uppercase ? '✓' : '✗'} Uppercase letter
            </Text>
            <Text style={[styles.check, checks.lowercase ? styles.checkPassed : styles.checkFailed]}>
            {checks.lowercase ? '✓' : '✗'} Lowercase letter
            </Text>
            <Text style={[styles.check, checks.number ? styles.checkPassed : styles.checkFailed]}>
            {checks.number ? '✓' : '✗'} Number
            </Text>
        </View>
        </View>
    );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
  },
  barContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  bar: {
    height: '100%',
    borderRadius: 2,
  },
  checks: {
    gap: 4,
  },
  check: {
    fontSize: 12,
    color: 'rgba(232,238,247,0.6)',
  },
  checkPassed: {
    color: colors.success,
  },
  checkFailed: {
    color: colors.error,
  },
});