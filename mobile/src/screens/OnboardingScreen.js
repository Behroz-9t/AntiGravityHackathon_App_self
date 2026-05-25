import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Animated, Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useBookings } from '../BookingContext';
import { T, GRADIENTS, SHADOWS } from '../theme';
import { Wrench, Bot, MapPin } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const SLIDES = [
    {
        Icon: Wrench,
        iconColor: '#38BDF8',
        title: 'خوش آمدید — اہلِ فن',
        subtitle: 'The smart, agentic home services marketplace designed to make your life effortless.',
        agenda: '⚡ On-demand local pros at your doorstep\n🛡️ Safe, vetted, and top-rated providers\n🇵🇰 Designed for Pakistan, multilingual support'
    },
    {
        Icon: Bot,
        iconColor: '#D4AF37',
        title: 'AI Agent Orchestrator',
        subtitle: 'No complex menus. Simply describe your problem in English, Roman Urdu, or Urdu.',
        agenda: '🔍 Natural language service interpretation\n📊 Automatic provider ranking and distance score\n🤝 Transparent service agreements and fixed estimates'
    },
    {
        Icon: MapPin,
        iconColor: '#10B981',
        title: 'Seamless Service Tracking',
        subtitle: 'Never guess provider arrival times. Real-time updates right on your screen.',
        agenda: '📍 Precise GPS map tracking & routing\n🔔 Auto notifications & 2-hr reminder alarms\n📭 Completely automated transaction receipts'
    }
];

export default function OnboardingScreen() {
    const { completeOnboarding } = useBookings();
    const insets = useSafeAreaInsets();
    const [index, setIndex] = useState(0);

    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;
    const emojiScale = useRef(new Animated.Value(1)).current;
    const contentOpacity = useRef(new Animated.Value(1)).current;
    const exitAnim = useRef(new Animated.Value(1)).current;

    const animateTransition = (direction) => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: direction > 0 ? -30 : 30,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            fadeAnim.setValue(1);
            slideAnim.setValue(direction > 0 ? 30 : -30);
            setIndex(prev => prev + direction);

            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 350,
                    useNativeDriver: true,
                }),
            ]).start();
        });
    };

    const handleNext = () => {
        if (index < SLIDES.length - 1) {
            animateTransition(1);
        } else {
            animateExit(() => completeOnboarding());
        }
    };

    const handleSkip = () => {
        animateExit(() => completeOnboarding());
    };

    const animateExit = (callback) => {
        Animated.parallel([
            Animated.timing(exitAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start(() => {
            callback();
        });
    };

    useEffect(() => {
        Animated.parallel([
            Animated.timing(emojiScale, {
                toValue: 1,
                duration: 450,
                useNativeDriver: true,
            }),
            Animated.timing(contentOpacity, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start();
    }, [index]);

    const slide = SLIDES[index];
    const IconComponent = slide.Icon;

    return (
        <Animated.View style={{ flex: 1, opacity: exitAnim, backgroundColor: '#0A0B0D' }}>
            {/* Header with safe area aware Skip button */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity
                    onPress={handleSkip}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            </View>

            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [
                            { translateX: slideAnim },
                        ],
                    },
                ]}
            >
                <Animated.View
                    style={[
                        styles.iconContainer,
                        {
                            opacity: contentOpacity,
                            transform: [
                                {
                                    scale: emojiScale.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.7, 1],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <LinearGradient
                        colors={['rgba(56,189,248,0.12)', 'rgba(212,175,55,0.06)']}
                        style={styles.iconGradient}
                    >
                        <IconComponent size={48} color={slide.iconColor} strokeWidth={1.5} />
                    </LinearGradient>
                    <View style={[styles.iconGlow, { shadowColor: slide.iconColor }]} />
                </Animated.View>

                <Animated.Text
                    style={[
                        styles.title,
                        {
                            opacity: contentOpacity,
                            transform: [
                                {
                                    translateY: contentOpacity.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [12, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    {slide.title}
                </Animated.Text>

                <Animated.Text
                    style={[
                        styles.subtitle,
                        {
                            opacity: contentOpacity,
                            transform: [
                                {
                                    translateY: contentOpacity.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [12, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    {slide.subtitle}
                </Animated.Text>

                <Animated.View
                    style={[
                        styles.agendaCard,
                        {
                            opacity: contentOpacity,
                            transform: [
                                {
                                    translateY: contentOpacity.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [16, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <Text style={styles.agendaTitle}>WHAT WE OFFER</Text>
                    <Text style={styles.agendaText}>{slide.agenda}</Text>
                </Animated.View>
            </Animated.View>

            <View style={styles.footer}>
                {/* Pagination Dots */}
                <View style={styles.dotsContainer}>
                    {SLIDES.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                i === index && styles.activeDot,
                            ]}
                        />
                    ))}
                </View>

                {/* Primary CTA */}
                <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                    <LinearGradient
                        colors={['#38BDF8', '#0284C7']}
                        style={styles.nextGrad}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.nextText}>
                            {index === SLIDES.length - 1 ? 'شروع کریں  →' : 'Continue'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#0A0B0D',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 24,
        paddingBottom: 8,
    },
    skipText: {
        color: '#64748B',
        fontSize: 14,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    iconContainer: {
        width: 110,
        height: 110,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 36,
        position: 'relative',
    },
    iconGradient: {
        width: 110,
        height: 110,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.20)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconGlow: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 36,
        shadowOpacity: 0.15,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 0 },
        zIndex: -1,
    },
    title: {
        color: '#F8FAFC',
        fontSize: 26,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    subtitle: {
        color: '#94A3B8',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    agendaCard: {
        backgroundColor: 'rgba(18, 20, 23, 0.95)',
        borderRadius: 20,
        padding: 20,
        width: '100%',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
        ...SHADOWS.card,
    },
    agendaTitle: {
        color: '#38BDF8',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: 12,
    },
    agendaText: {
        color: '#F8FAFC',
        fontSize: 14,
        lineHeight: 24,
        fontWeight: '500',
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: 32,
        alignItems: 'center',
    },
    dotsContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 24,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    activeDot: {
        width: 24,
        backgroundColor: '#38BDF8',
        borderRadius: 4,
    },
    nextBtn: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        ...SHADOWS.btn,
    },
    nextGrad: {
        paddingVertical: 18,
        alignItems: 'center',
    },
    nextText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    },
});
