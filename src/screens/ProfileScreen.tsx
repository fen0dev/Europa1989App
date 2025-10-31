import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Pressable,
  Animated,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserProfile, updateUserProfile, uploadProfileImage, logout } from '../api/profile';
import { colors, radius, spacing } from '../theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useToast } from '../screens/notification/toast/Toast';
import { useFormValidation, validators } from '../hooks/useFormValidation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const topPad = Math.max(headerHeight, insets.top) + 15;

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [hasEdited, setHasEdited] = useState(false);
  const saveButtonAnim = React.useRef(new Animated.Value(0)).current;

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: getUserProfile,
  });

  const { errors, touched, validateField, markTouched, hasError } = useFormValidation({
    fullName: [validators.required('Full name is required')],
    phone: [validators.phone('Invalid phone number format')],
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  useEffect(() => {
    if (hasEdited) {
      Animated.spring(saveButtonAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      Animated.timing(saveButtonAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [hasEdited]);

  const { mutate: saveProfile, isPending: isSaving } = useMutation({
    mutationFn: () => updateUserProfile({ full_name: fullName, phone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setHasEdited(false);
      toast.showToast('Profile updated successfully', 'success');
    },
    onError: (error: any) => {
      toast.showToast(error.message || 'Unable to update profile. Please try again.', 'error');
    },
  });

  const { mutate: uploadImage, isPending: isUploading } = useMutation({
    mutationFn: uploadProfileImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.showToast('Profile picture updated successfully', 'success');
    },
    onError: (error: any) => {
      toast.showToast(error.message || 'Unable to update picture. Please try again.', 'error');
    },
  });

  const { mutate: handleLogout, isPending: isLoggingOut } = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      toast.showToast('Logged out successfully', 'info');
    },
    onError: (error: any) => {
      toast.showToast(error.message || 'Unable to logout. Please try again.', 'error');
    },
  });

  const onFieldChange = (field: 'name' | 'phone', value: string) => {
    setHasEdited(true);
    if (field === 'name') {
      setFullName(value);
      if (touched.fullName) validateField('fullName', value);
    }
    if (field === 'phone') {
      setPhone(value);
      if (touched.phone) validateField('phone', value);
    }
  };

  const handleSave = () => {
    markTouched('fullName');
    markTouched('phone');
    
    if (!validateField('fullName', fullName) || !validateField('phone', phone)) {
      return;
    }
    
    saveProfile();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.fg} size="large" />
      </View>
    );
  }

  const avatarUrl = profile?.avatar_url;
  const saveButtonTranslateY = saveButtonAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });
  const saveButtonOpacity = saveButtonAnim;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.header, { marginTop: topPad }]}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.avatarSection}>
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={60} color="rgba(255,255,255,0.3)" />
            </View>
          )}
          {isUploading && (
            <View style={styles.avatarLoading}>
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
              <ActivityIndicator color="#fff" size="large" />
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.changePhotoBtn}
          onPress={() => uploadImage()}
          disabled={isUploading}
          accessibilityLabel="Change profile picture"
        >
          <Ionicons name="camera" size={18} color={colors.fg} />
          <Text style={styles.changePhotoText}>
            {avatarUrl ? 'Change' : 'Upload'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Email</Text>
        <View style={[styles.inputContainer, styles.readOnly]}>
          <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.4)" />
          <Text style={styles.readOnlyText}>{profile?.email || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Full Name</Text>
        <View style={[
          styles.inputContainer,
          hasError('fullName') && styles.inputContainerError,
        ]}>
          <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.4)" />
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={(v) => onFieldChange('name', v)}
            onBlur={() => markTouched('fullName')}
            placeholder="Your full name"
            placeholderTextColor="rgba(255,255,255,0.3)"
            accessibilityLabel="Full name input"
            accessibilityHint="Enter your full name"
          />
        </View>
        {hasError('fullName') && (
          <Text style={styles.errorText}>{errors.fullName}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Phone</Text>
        <View style={[
          styles.inputContainer,
          hasError('phone') && styles.inputContainerError,
        ]}>
          <Ionicons name="call-outline" size={20} color="rgba(255,255,255,0.4)" />
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={(v) => onFieldChange('phone', v)}
            onBlur={() => markTouched('phone')}
            placeholder="+45 12 34 56 78"
            placeholderTextColor="rgba(255,255,255,0.3)"
            keyboardType="phone-pad"
            accessibilityLabel="Phone input"
            accessibilityHint="Enter your phone number"
          />
        </View>
        {hasError('phone') && (
          <Text style={styles.errorText}>{errors.phone}</Text>
        )}
      </View>

      <Animated.View
        style={[
          styles.saveButtonContainer,
          {
            opacity: saveButtonOpacity,
            transform: [{ translateY: saveButtonTranslateY }],
          },
        ]}
        pointerEvents={hasEdited ? 'auto' : 'none'}
      >
        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            pressed && { opacity: 0.85 },
          ]}
          onPress={handleSave}
          disabled={isSaving || hasError('fullName') || hasError('phone')}
          accessibilityLabel="Save changes"
          accessibilityState={{ disabled: isSaving }}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.saveBtnText}>Save changes</Text>
            </>
          )}
        </Pressable>
      </Animated.View>

      <View style={{ height: spacing.xl }} />

      <Pressable
        style={({ pressed }) => [
          styles.logoutBtn,
          pressed && { opacity: 0.85 },
        ]}
        onPress={() => {
          handleLogout();
        }}
        disabled={isLoggingOut}
        accessibilityLabel="Logout"
        accessibilityState={{ disabled: isLoggingOut }}
      >
        {isLoggingOut ? (
          <ActivityIndicator color={colors.danger} />
        ) : (
          <>
            <Ionicons name="log-out-outline" size={22} color={colors.danger} />
            <Text style={styles.logoutText}>Logout</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl * 2,
  },
  header: {
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.fg,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLoading: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  changePhotoBtn: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  changePhotoText: {
    color: colors.fg,
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 12,
  },
  inputContainerError: {
    borderColor: colors.error,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  readOnly: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  readOnlyText: {
    flex: 1,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
  },
  input: {
    flex: 1,
    color: colors.fg,
    fontSize: 16,
    paddingVertical: 2,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    marginTop: spacing.xs,
    marginLeft: spacing.md,
  },
  saveButtonContainer: {
    marginTop: spacing.lg,
  },
  saveBtn: {
    backgroundColor: 'rgba(79, 255, 191, 0.5)',
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    flexDirection: 'row',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,85,85,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,85,85,0.2)',
    minHeight: 52,
  },
  logoutText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '700',
  },
});