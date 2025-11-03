import React, { useState, useEffect, useMemo } from 'react';
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
import { useNavigation } from '@react-navigation/native';

const ACCENT_PALETTE = ['#4FFFBF', '#FF85F3', '#8AE2FF', '#FFD166', '#FF6B6B', '#9B5DFF'];
const FUN_NICKNAMES = [
  'French Fries King',
  'Mechanic Cook',
  'The Dirty Duck',
  'The Pizza Dude',
  'The Playlist Queen',
  'The Spoiler Guard',
  'The Tortellini Engineer',
  'The Coffee Connoisseur',
  'The Wine Enthusiast',
  'The Beer Lover',
  'The Tea Time Master',
  'The Cocktail Crafter',
  'The Wine Connoisseur',
  'The Beer Lover',
  'The Tea Time Master',
  'The Cocktail Crafter',
];

const STATUS_MAX_LENGTH = 80;

function getContrastColor(hex: string) {
  const normalized = hex?.replace('#', '') || '';
  if (normalized.length !== 6) return '#0B0B0E';

  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#0B0B0E' : '#FFFFFF';
}

function getSecondaryTextColor(primary: string) {
  return primary === '#FFFFFF' ? 'rgba(255,255,255,0.85)' : 'rgba(11,11,14,0.7)';
}

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<any>();
  const topPad = Math.max(headerHeight, insets.top) + 15;

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [nickname, setNickname] = useState('');
  const [accentColor, setAccentColor] = useState('#4FFFBF');
  const [statusMessage, setStatusMessage] = useState('');
  const [hasEdited, setHasEdited] = useState(false);
  const saveButtonAnim = React.useRef(new Animated.Value(0)).current;

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: getUserProfile,
  });

  const { errors, touched, validateField, markTouched, hasError } = useFormValidation({
    fullName: [validators.required('Full name is required')],
    phone: [validators.phone('Invalid phone number format')],
    nickname: [validators.minLength(3, 'Nickname must be at least 3 characters')],
    statusMessage: [
      validators.minLength(10, 'If you add a status, use at least 10 characters'),
      validators.maxLength(STATUS_MAX_LENGTH, `Max ${STATUS_MAX_LENGTH} characters`),
    ],
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setNickname(profile.nickname || '');
      setAccentColor(profile.accent_color || '#4FFFBF');
      setStatusMessage(profile.status_message || '');
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
    mutationFn: () => updateUserProfile({
      full_name: fullName,
      phone,
      nickname,
      accent_color: accentColor,
      status_message: statusMessage,
    }),
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
      queryClient.clear();
    },
    onError: (error: any) => {
      toast.showToast(error.message || 'Unable to logout. Please try again.', 'error');
    },
  });

  const onFieldChange = (field: 'name' | 'phone' | 'nickname' | 'status' | 'accentColor', value: string) => {
    setHasEdited(true);
    if (field === 'name') {
      setFullName(value);
      if (touched.fullName) validateField('fullName', value);
    }
    if (field === 'phone') {
      setPhone(value);
      if (touched.phone) validateField('phone', value);
    }
    if (field === 'nickname') {
      setNickname(value);
      if (touched.nickname) validateField('nickname', value);
    }
    if (field === 'status') {
      setStatusMessage(value);
      if (touched.statusMessage) validateField('statusMessage', value);
    }
    if (field === 'accentColor') {
      setAccentColor(value);
    }
  };

  const handleRandomNickname = React.useCallback(() => {
    setHasEdited(true);
    const pool = FUN_NICKNAMES.filter((option) => option !== nickname);
    const nextOptions = pool.length ? pool : FUN_NICKNAMES;
    const randomNickname = nextOptions[Math.floor(Math.random() * nextOptions.length)];
    setNickname(randomNickname);
    markTouched('nickname');
    validateField('nickname', randomNickname);
    toast.showToast(`Nickname updated to ${randomNickname}`, 'info');
  }, [nickname, markTouched, toast, validateField]);

  const handleSave = () => {
    markTouched('fullName');
    markTouched('phone');
    markTouched('nickname');
    markTouched('statusMessage');
    
    const validatorsPassed = [
      validateField('fullName', fullName),
      validateField('phone', phone),
      validateField('nickname', nickname),
      validateField('statusMessage', statusMessage),
    ].every(Boolean);

    if (!validatorsPassed) return;
    
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
  const previewPrimaryColor = getContrastColor(accentColor);
  const previewSecondaryColor = getSecondaryTextColor(previewPrimaryColor);
  const previewAvatarBackground = previewPrimaryColor === '#FFFFFF'
    ? 'rgba(255,255,255,0.18)'
    : 'rgba(0,0,0,0.12)';
  const previewIconColor = previewPrimaryColor === '#FFFFFF'
    ? 'rgba(255,255,255,0.75)'
    : 'rgba(0,0,0,0.45)';

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
      <Text style={styles.label}>Profile preview</Text>
      <View
        style={[styles.previewCard, { backgroundColor: accentColor }]}
        accessibilityLabel="Preview"
      >
        <View
          style={[
            styles.previewAvatar,
            { backgroundColor: previewAvatarBackground },
          ]}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.previewAvatarImage} />
          ) : (
            <Ionicons name="person" size={42} color={previewIconColor} />
          )}
        </View>
        <View style={styles.previewTextGroup}>
          <Text style={[styles.previewFullName, { color: previewPrimaryColor }]}>
            {fullName || 'Your full name'}
          </Text>
          <Text style={[styles.previewNickname, { color: previewSecondaryColor }]}>
            {nickname ? `aka ${nickname}` : 'Choose a playful nickname'}
          </Text>
          {!!statusMessage?.trim() && (
            <Text
              style={[styles.previewStatus, { color: previewSecondaryColor }]}
              numberOfLines={2}
            >
              {statusMessage}
            </Text>
          )}
        </View>
      </View>
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
      <Text style={styles.label}>Nickname</Text>
      <View style={[
        styles.inputContainer,
        styles.inputWithAction,
        hasError('nickname') && styles.inputContainerError,
      ]}>
        <Ionicons name="sparkles-outline" size={20} color="rgba(255,255,255,0.4)" />
        <TextInput
          style={styles.input}
          value={nickname}
          onChangeText={(v) => onFieldChange('nickname', v)}
          onBlur={() => markTouched('nickname')}
          placeholder="Es. The Vegan Beef Eater"
          placeholderTextColor="rgba(255,255,255,0.3)"
          accessibilityLabel="Nickname input"
          accessibilityHint="Choose a fun nickname"
        />
        <Pressable
          onPress={handleRandomNickname}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && { opacity: 0.8 },
          ]}
          accessibilityLabel="Generate random nickname"
          accessibilityHint="Set a random fun nickname"
        >
          <Ionicons name="shuffle-outline" size={18} color={colors.fg} />
        </Pressable>
      </View>
      {hasError('nickname') && (
        <Text style={styles.errorText}>{errors.nickname}</Text>
      )}
    </View>

    <View style={styles.section}>
      <Text style={styles.label}>Accent color</Text>
      <View style={styles.colorRow}>
        {ACCENT_PALETTE.map((color) => (
          <Pressable
            key={color}
            onPress={() => onFieldChange('accentColor', color)}
            style={[
              styles.colorSwatch,
              { backgroundColor: color },
              accentColor === color && styles.colorSwatchActive,
            ]}
            accessibilityLabel={`Select accent color ${color}`}
            accessibilityState={{ selected: accentColor === color }}
          >
            {accentColor === color && (
              <Ionicons
                name="checkmark"
                size={18}
                color={getContrastColor(color)}
              />
            )}
          </Pressable>
        ))}
      </View>
    </View>

    <View style={styles.section}>
      <Text style={styles.label}>Status message</Text>
      <View style={[
        styles.inputContainer,
        styles.inputMultiline,
        hasError('statusMessage') && styles.inputContainerError,
      ]}>
        <Ionicons name="chatbubble-ellipses-outline" size={20} color="rgba(255,255,255,0.4)" />
        <TextInput
          style={[styles.input, styles.inputMultilineText]}
          value={statusMessage}
          onChangeText={(v) => onFieldChange('status', v)}
          onBlur={() => markTouched('statusMessage')}
          placeholder="Type something memorable..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          accessibilityLabel="Status message input"
          accessibilityHint="Describe your current vibe"
          multiline
          maxLength={STATUS_MAX_LENGTH}
        />
      </View>
      <View style={styles.helperRow}>
        <Text style={styles.helperText}>{`${statusMessage.length}/${STATUS_MAX_LENGTH}`}</Text>
      </View>
      {hasError('statusMessage') && (
        <Text style={styles.errorText}>{errors.statusMessage}</Text>
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
          disabled={
            isSaving ||
            hasError('fullName') ||
            hasError('phone') ||
            hasError('nickname') ||
            hasError('statusMessage')
          }
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
  inputWithAction: {
    paddingRight: spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
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
  previewCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: '#4FFFBF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  previewAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewAvatarImage: {
    width: '100%',
    height: '100%',
  },
  previewTextGroup: { flex: 1 },
  previewFullName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0B0B0E',
  },
  previewNickname: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(11,11,14,0.7)',
    marginTop: 4,
  },
  previewStatus: {
    fontSize: 14,
    color: 'rgba(11,11,14,0.7)',
    marginTop: 6,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchActive: {
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  inputMultiline: { alignItems: 'flex-start' },
  inputMultilineText: { minHeight: 80, textAlignVertical: 'top' },
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.xs / 2,
  },
  helperText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    marginTop: spacing.xs / 2,
    marginLeft: 0,
  },
});