import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Dimensions,
    Animated,
    Pressable,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, shadow } from '../../theme/tokens';
import { hasCompletedOnboarding, setOnboardingCompleted } from '../../hooks/onboarding/onboardingStorage';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = spacing.xl * 2;

interface OnboardingCard {
    id: string;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
    gradient: string[];
}

const ONBOARDING_DATA: OnboardingCard[] = [
    {
        id: '1',
        icon: 'book-outline',
        title: 'Work Manuals',
        description: 'Access all technical, standard, and safety procedures in one place.',
        gradient: ['rgba(79, 140, 255, 0.2)', 'rgba(79, 140, 255, 0.05)'],
    },
    {
        id: '2',
        icon: 'checkmark-circle-outline',
        title: 'Quick Quiz-Check',
        description: 'Complete quick quizzes to test your understanding and complete manuals.',
        gradient: ['rgba(29, 33, 29, 0.2)', 'rgba(76, 175, 80, 0.05)'],
    },
    {
        id: '3',
        icon: 'trophy-outline',
        title: 'Track Your Progress',
        description: 'View your achievements and keep track of completed manuals.',
        gradient: ['rgba(255, 152, 0, 0.2)', 'rgba(255, 152, 0, 0.05)'],
    },
];

interface OnboardingScreenProps {
    onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
    const insets = useSafeAreaInsets();
    const flatListRef = useRef<FlatList>(null);
    const scrollX = useRef(new Animated.Value(0)).current;
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleNext = () => {
        if (currentIndex < ONBOARDING_DATA.length - 1) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const nextIndex = currentIndex + 1;
            flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
            setCurrentIndex(nextIndex);
        } else {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (currentIndex > 0) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const prevIndex = currentIndex - 1;
            flatListRef.current?.scrollToIndex({ index: prevIndex, animated: true });
            setCurrentIndex(prevIndex);
        }
    };

    const handleComplete = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setOnboardingCompleted();
        onComplete();
    };

    const handleScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX }} }],
        { useNativeDriver: false }
    );

    const handleMomentumScrollEnd = (event: any) => {
        const idx = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        setCurrentIndex(idx);
    };

    const renderCard = ({ item, idx }: { item: OnboardingCard, idx: number }) => {
        const inputRange = [
            (idx - 1) * SCREEN_WIDTH,
            idx * SCREEN_WIDTH,
            (idx + 1) * SCREEN_WIDTH,
        ];

        const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.9, 1, 0.9],
            extrapolate: 'clamp',
        });

        const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.5, 1, 0.5],
            extrapolate: 'clamp',
        });

        return (
            <View style={styles.cardContainer}>
                <Animated.View
                    style={[
                        styles.card,
                        {
                            transform: [{ scale }],
                            opacity,
                        },
                    ]}
                >
                    <BlurView intensity={50} tint="dark" style={styles.cardBlur}>
                        <LinearGradient
                            colors={item.gradient as [string, string]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.gradientOverlay}
                        />

                        <View style={styles.iconContainer}>
                            <View style={styles.iconCircle}>
                                <Ionicons name={item.icon} size={64} color={colors.primary} />
                            </View>
                        </View>

                        <View style={styles.textContainer}>
                            <Text style= {styles.title}>{item.title}</Text>
                            <Text style={styles.description}>{item.description}</Text>
                        </View>
                    </BlurView>
                </Animated.View>
            </View>
        );
    };

    const renderPagination = () => {
        return (
          <View style={styles.paginationContainer}>
            {ONBOARDING_DATA.map((_, index) => {
                const inputRange = [
                    (index - 1) * SCREEN_WIDTH,
                    index * SCREEN_WIDTH,
                    (index + 1) * SCREEN_WIDTH,
                ];
        
                const dotWidth = scrollX.interpolate({
                    inputRange,
                    outputRange: [8, 24, 8],
                    extrapolate: 'clamp',
                });
        
                const dotOpacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.3, 1, 0.3],
                    extrapolate: 'clamp',
                });
    
                return (
                    <Animated.View
                        key={index}
                        style={[
                            styles.paginationDot,
                            {
                            width: dotWidth,
                            opacity: dotOpacity,
                            },
                        ]}
                    />
                );
            })}
          </View>
        );
    };

    return (
        <LinearGradient colors={['#0b0f14', '#0b0f14']} style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
                <Pressable
                    onPress={handleComplete}
                    style={styles.skipButton}
                    accessibilityLabel='Skip onboarding'
                >
                    <Text style={styles.skipText}>Skip</Text>
                </Pressable>
            </View>

            <FlatList
                ref={flatListRef}
                data={ONBOARDING_DATA}
                renderItem={({ item, index }) => renderCard({ item, idx: index })}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={handleScroll}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                onScrollToIndexFailed={(info) => {
                    setTimeout(() => {
                        flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
                    }, 100);
                }}
                keyExtractor={(item) => item.id}
            />

            {renderPagination()}

            <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
                <View style={styles.buttonContainer}>
                    {currentIndex > 0 && (
                        <Pressable
                            onPress={handleBack}
                            style={styles.backButton}
                            accessibilityLabel='Go to previous card'
                        >
                            <Ionicons name="chevron-back" size={24} color={colors.fg} />
                        </Pressable>
                    )}

                    <Pressable
                        onPress={handleNext}
                        style={({ pressed }) => [
                            styles.nextButton,
                            pressed && styles.nextButtonPressed,
                        ]}
                        accessibilityLabel={
                            currentIndex === ONBOARDING_DATA.length - 1
                                ? 'Complete'
                                : 'Next'
                        }
                    >
                        <LinearGradient
                            colors={['rgba(23, 238, 120, 0.37)', 'rgba(23, 238, 224, 0.46)']}
                            start={{ x: 0, y: 0}}
                            end={{ x: 1, y: 1 }}
                            style={styles.nextButtonGradient}
                        >
                            <Text style={styles.nextButtonText}>
                                {currentIndex === ONBOARDING_DATA.length - 1 ? 'Start' : 'Next'}
                            </Text>
                            {currentIndex < ONBOARDING_DATA.length - 1 && (
                                <Ionicons name='chevron-forward' size={20} color='#fff' style={{ marginLeft: 4}} />
                            )}
                        </LinearGradient>
                    </Pressable>
                </View>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      paddingHorizontal: spacing.xl,
      alignItems: 'flex-end',
      zIndex: 10,
    },
    skipButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    skipText: {
      color: 'rgba(232, 238, 247, 0.7)',
      fontSize: 16,
      fontWeight: '500',
    },
    cardContainer: {
      width: SCREEN_WIDTH,
      paddingHorizontal: CARD_PADDING,
      justifyContent: 'center',
      alignItems: 'center',
    },
    card: {
      width: SCREEN_WIDTH - CARD_PADDING * 1.25,
      aspectRatio: 0.85,
      borderRadius: radius.xl,
      overflow: 'hidden',
    },
    cardBlur: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
      borderRadius: radius.xl,
      padding: spacing.xl * 2,
      justifyContent: 'space-between',
      ...shadow.ios,
      ...shadow.android,
    },
    gradientOverlay: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: radius.xl,
    },
    iconContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconCircle: {
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: 'rgba(79, 140, 255, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'rgba(79, 140, 255, 0.3)',
    },
    textContainer: {
      alignItems: 'center',
      paddingTop: spacing.xl,
    },
    title: {
      color: colors.fg,
      fontSize: 28,
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: spacing.md,
      letterSpacing: 0.3,
    },
    description: {
      color: 'rgba(232, 238, 247, 0.8)',
      fontSize: 16,
      textAlign: 'center',
      lineHeight: 24,
      paddingHorizontal: spacing.md,
    },
    paginationContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.lg,
      gap: spacing.sm,
    },
    paginationDot: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    footer: {
      paddingHorizontal: spacing.xl,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
    },
    backButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    nextButton: {
      flex: 1,
      borderRadius: radius.lg,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: 'rgba(23, 238, 119, 0.59)',
          shadowOpacity: 0.4,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
        },
        android: {
          elevation: 8,
        },
      }),
    },
    nextButtonPressed: {
      opacity: 0.9,
    },
    nextButtonGradient: {
      paddingVertical: spacing.md + 4,
      paddingHorizontal: spacing.xl,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    nextButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
});