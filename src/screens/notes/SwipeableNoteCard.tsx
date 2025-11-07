import React, { useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Pressable } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';
import { NoteCard } from './NoteCard';
import { ManualNote } from '../../api/notes';
import { useAdmin } from '../../hooks/useAdmin';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ACTION_WIDTH = 80;

type SwipeableNoteCardProps = {
    note: ManualNote;
    manualId: string;
    onPress?: () => void;
    onDelete?: () => void;
    onPin?: () => void;
    onReport?: () => void;
    onHide?: () => void;
};

export function SwipeableNoteCard({
    note,
    manualId,
    onPress,
    onDelete,
    onPin,
    onReport,
    onHide,
}: SwipeableNoteCardProps) {
    const { isAdmin } = useAdmin();
    const swipeableRef = useRef<Swipeable>(null);

    const renderRightActions = (
        progress: Animated.AnimatedInterpolation<number>,
        dragX: Animated.AnimatedInterpolation<number>
    ) => {
        const translateX = dragX.interpolate({
            inputRange: [0, ACTION_WIDTH * 2],
            outputRange: [0, ACTION_WIDTH * 2],
            extrapolate: 'clamp',
        });

        const scale = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.8, 1],
            extrapolate: 'clamp',
        });

        const opacity = progress.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0.5, 1],
            extrapolate: 'clamp',
        });

        if (isAdmin) {
            // Admin: Elimina e Segnala
            return (
                <View style={styles.rightActions}>
                    {!note.is_reported && (
                        <Animated.View
                            style={[
                                styles.actionButton,
                                styles.reportButton,
                                {
                                    transform: [{ scale }, { translateX }],
                                    opacity,
                                },
                            ]}
                        >
                            <Pressable
                                style={styles.actionPressable}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    swipeableRef.current?.close();
                                    onReport?.();
                                }}
                            >
                                <Ionicons name="flag" size={24} color="#fff" />
                                <Text style={styles.actionText}>Report</Text>
                            </Pressable>
                        </Animated.View>
                    )}
                    <Animated.View
                        style={[
                            styles.actionButton,
                            styles.deleteButton,
                            {
                                transform: [{ scale }, { translateX }],
                                opacity,
                            },
                        ]}
                    >
                        <Pressable
                            style={styles.actionPressable}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                                swipeableRef.current?.close();
                                onDelete?.();
                            }}
                        >
                            <Ionicons name="trash" size={24} color="#fff" />
                            <Text style={styles.actionText}>Delete</Text>
                        </Pressable>
                    </Animated.View>
                </View>
            );
        } else {
            // User normale: Nascondi e Pin
            return (
                <View style={styles.rightActions}>
                    <Animated.View
                        style={[
                            styles.actionButton,
                            styles.hideButton,
                            {
                                transform: [{ scale }, { translateX }],
                                opacity,
                            },
                        ]}
                    >
                        <Pressable
                            style={styles.actionPressable}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                swipeableRef.current?.close();
                                onHide?.();
                            }}
                        >
                            <Ionicons name="eye-off" size={24} color="#fff" />
                            <Text style={styles.actionText}>
                                {note.is_public ? 'Hide' : 'Show'}
                            </Text>
                        </Pressable>
                    </Animated.View>
                    <Animated.View
                        style={[
                            styles.actionButton,
                            styles.pinButton,
                            {
                                transform: [{ scale }, { translateX }],
                                opacity,
                            },
                        ]}
                    >
                        <Pressable
                            style={styles.actionPressable}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                swipeableRef.current?.close();
                                onPin?.();
                            }}
                        >
                            <Ionicons 
                                name={note.is_pinned ? "pin" : "pin-outline"} 
                                size={24} 
                                color="#fff" 
                            />
                            <Text style={styles.actionText}>
                                {note.is_pinned ? 'Unpin' : 'Pin'}
                            </Text>
                        </Pressable>
                    </Animated.View>
                </View>
            );
        }
    };

    const renderLeftActions = (
        progress: Animated.AnimatedInterpolation<number>,
        dragX: Animated.AnimatedInterpolation<number>
    ) => {
        // Solo per admin: Pin a sinistra
        if (!isAdmin) return null;

        const translateX = dragX.interpolate({
            inputRange: [-ACTION_WIDTH, 0],
            outputRange: [-ACTION_WIDTH, 0],
            extrapolate: 'clamp',
        });

        const scale = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.8, 1],
            extrapolate: 'clamp',
        });

        const opacity = progress.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0.5, 1],
            extrapolate: 'clamp',
        });

        return (
            <View style={styles.leftActions}>
                <Animated.View
                    style={[
                        styles.actionButton,
                        styles.pinButton,
                        {
                            transform: [{ scale }, { translateX }],
                            opacity,
                        },
                    ]}
                >
                    <Pressable
                        style={styles.actionPressable}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            swipeableRef.current?.close();
                            onPin?.();
                        }}
                    >
                        <Ionicons 
                            name={note.is_pinned ? "pin" : "pin-outline"} 
                            size={24} 
                            color="#fff" 
                        />
                        <Text style={styles.actionText}>
                            {note.is_pinned ? 'Unpin' : 'Pin'}
                        </Text>
                    </Pressable>
                </Animated.View>
            </View>
        );
    };

    return (
        <Swipeable
            ref={swipeableRef}
            renderRightActions={renderRightActions}
            renderLeftActions={renderLeftActions}
            friction={2}
            overshootRight={false}
            overshootLeft={false}
            rightThreshold={40}
            leftThreshold={40}
            onSwipeableWillOpen={(direction) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
        >
            <NoteCard
                note={note}
                manualId={manualId}
                onPress={onPress}
                showDelete={false}
            />
        </Swipeable>
    );
}

const styles = StyleSheet.create({
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginBottom: spacing.md,
    },
    leftActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginBottom: spacing.md,
    },
    actionButton: {
        width: ACTION_WIDTH,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: radius.xl,
        marginHorizontal: spacing.xs / 2,
    },
    actionPressable: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButton: {
        backgroundColor: '#FF6B6B',
    },
    reportButton: {
        backgroundColor: '#FFC107',
    },
    hideButton: {
        backgroundColor: '#9E9E9E',
    },
    pinButton: {
        backgroundColor: '#4CAF50',
    },
    actionText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginTop: spacing.xs / 2,
    },
});