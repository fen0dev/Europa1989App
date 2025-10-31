import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../../theme/tokens';
import * as Haptics from 'expo-haptics';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export function ToastProvider({ children }: { children: React.ReactNode}) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const insets = useSafeAreaInsets();

    const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast: Toast = { id, message, type, duration };

        setToasts((prev) => [...prev, newToast]);

        // haptic feedback
        if (type === 'success') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (type === 'error') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const getIcon = (type: ToastType) => {
        switch (type) {
            case 'success':
              return 'checkmark-circle';
            case 'error':
              return 'close-circle';
            case 'warning':
              return 'warning';
            case 'info':
              return 'information-circle';
        }
    };

    const getColors = (type: ToastType) => {
        switch (type) {
            case 'success':
              return { bg: colors.successBg, icon: colors.success, border: colors.success };
            case 'error':
              return { bg: colors.errorBg, icon: colors.error, border: colors.error };
            case 'warning':
              return { bg: colors.warningBg, icon: colors.warning, border: colors.warning };
            case 'info':
              return { bg: colors.infoBg, icon: colors.info, border: colors.info };
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <View style={[styles.container, { top: insets.top + 10 }]} pointerEvents="box-none">
                {toasts.map((toast) => (
                    <ToastItem
                        key={toast.id}
                        toast={toast}
                        onRemove={removeToast}
                        getIcon={getIcon}
                        getColors={getColors}
                    />
                ))}
            </View>
        </ToastContext.Provider>
    );
}

function ToastItem({
    toast,
    onRemove,
    getIcon,
    getColors,
}: {
    toast: Toast,
    onRemove: (id: string) => void,
    getIcon: (type: ToastType) => string;
    getColors: (type: ToastType) => { bg: string; icon: string; border: string };
}) {
    const slideAnim = React.useRef(new Animated.Value(-100)).current;
    const opacityAnim = React.useRef(new Animated.Value(0)).current;
    const colors = getColors(toast.type);

    React.useEffect(() => {
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
    }, []);

    const handleRemove = () => {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: -100,
            useNativeDriver: true,
            duration: 200,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            useNativeDriver: true,
            duration: 200,
          }),
        ]).start(() => onRemove(toast.id));
    };

    return (
        <Animated.View
          style={[
            styles.toast,
            {
              backgroundColor: colors.bg,
              borderColor: colors.border,
              opacity: opacityAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Pressable onPress={handleRemove} style={styles.content}>
            <Ionicons name={getIcon(toast.type) as any} size={20} color={colors.icon} />
            <Text style={styles.message}>{toast.message}</Text>
            <Pressable onPress={handleRemove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={18} color={colors.icon} style={{ opacity: 0.7 }} />
            </Pressable>
          </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      left: spacing.xl,
      right: spacing.xl,
      zIndex: 9999,
      alignItems: 'stretch',
    },
    toast: {
      marginBottom: spacing.sm,
      borderRadius: radius.lg,
      borderWidth: 1,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
        },
        android: {
          elevation: 6,
        },
      }),
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    message: {
      flex: 1,
      color: colors.fg,
      fontSize: 14,
      fontWeight: '500',
    },
  });