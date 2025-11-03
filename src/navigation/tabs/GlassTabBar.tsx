import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Text, LayoutChangeEvent } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors } from '../../theme/tokens';

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
    Home: 'book-outline',
    Search: 'trophy-outline',
    Profile: 'person-circle-outline',
};

const LABEL_MAP: Record<string, string> = {
    Home: 'Manuals',
    Search: 'Achievements',
    Profile: 'Profile',
};

export default function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const [width, setWidth] = useState(0);
    const tabCount = state.routes.length;
    const innerPadding = 10;
    const barHeight = 64;
    const bottomPad = Math.max(insets.bottom, 12);

    const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
    const tabWidth = Math.max(1, (width - innerPadding * 2) / tabCount);
    
    const translateX = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.spring(translateX, {
          toValue: state.index * tabWidth,
          useNativeDriver: true,
          bounciness: 8,
          speed: 12,
        }).start();
    }, [state.index, tabWidth]);

    const activeColor = '#fff';
    const inactiveColor = 'rgba(255,255,255,0.6)';

    return (
        <View style={[styles.wrapper, { paddingBottom: bottomPad - 8, backgroundColor: colors.bg }]}>
          <View style={[styles.container, { height: barHeight, borderRadius: 30 }]}>
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[styles.inner, { paddingHorizontal: innerPadding }]} onLayout={onLayout}>
              {/* Pill animata */}
              <Animated.View
                style={[
                  styles.pill,
                  {
                    width: tabWidth,
                    transform: [{ translateX }],
                  },
                ]}
              />
              {state.routes.map((route, idx) => {
                const isFocused = state.index === idx;
                const { options } = descriptors[route.key];
    
                const onPress = () => {
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                };
    
                const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });
    
                const iconName = ICON_MAP[route.name] ?? 'ellipse-outline';
                const label = LABEL_MAP[route.name] ?? route.name;
                const accessibilityLabel = `${label} tab${isFocused ? ', selected' : ''}`;
    
                return (
                  <TouchableOpacity
                    key={route.key}
                    accessibilityRole="button"
                    accessibilityLabel={accessibilityLabel}
                    accessibilityState={isFocused ? { selected: true } : {}}
                    accessibilityHint={`Navigate to ${label}`}
                    onPress={onPress}
                    onLongPress={onLongPress}
                    style={[styles.tab, { width: tabWidth }]}
                    activeOpacity={0.9}
                  >
                    <View style={styles.iconContainer}>
                      <Ionicons name={iconName as any} size={24} color={isFocused ? activeColor : inactiveColor} />
                    </View>
                    <Text 
                      style={[
                        styles.label,
                        { color: isFocused ? activeColor : inactiveColor },
                        isFocused && styles.labelActive,
                      ]}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
    );
}
    
const styles = StyleSheet.create({
    wrapper: {
        paddingHorizontal: 16,
        paddingTop: 6,
    },
    container: {
        backgroundColor: 'rgba(0, 53, 1, 0.11)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        overflow: 'hidden',
    },
    inner: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    pill: {
        position: 'absolute',
        top: 8,
        bottom: 8,
        left: 10,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 22,
    },
    tab: {
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    label: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    labelActive: {
        fontWeight: '700',
    },
    iconContainer: {
        position: 'relative',
    },
});