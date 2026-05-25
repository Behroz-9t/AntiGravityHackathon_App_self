import React, { useState, useRef } from 'react';
import {
    View, Text, Modal, TouchableOpacity, StyleSheet,
    Animated, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getTheme, GRADIENTS, SHADOWS } from '../theme';
import { useBookings } from '../BookingContext';

const RATING_META = [
    { label: 'Terrible',  color: '#EF4444', emoji: '😞' },
    { label: 'Poor',      color: '#F59E0B', emoji: '😐' },
    { label: 'Good',      color: '#FBBF24', emoji: '🙂' },
    { label: 'Great',     color: '#22C55E', emoji: '😊' },
    { label: 'Excellent', color: '#1A6BFF', emoji: '🤩' },
];

export default function RatingModal({ visible, providerName, bookingId, onSubmit }) {
    const { isDarkMode } = useBookings();
    const T = getTheme(isDarkMode);
    const styles = makeStyles(T);
    const [selected, setSelected] = useState(0);
    const [review,   setReview]   = useState('');
    const [inputFocused, setInputFocused] = useState(false);
    const scaleAnims = useRef([...Array(5)].map(() => new Animated.Value(1))).current;
    const slideAnim  = useRef(new Animated.Value(80)).current;
    const fadeAnim   = useRef(new Animated.Value(0)).current;

    const onShow = () => {
        Animated.parallel([
            Animated.timing(fadeAnim,  { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }),
        ]).start();
    };

    const handleStar = (i) => {
        setSelected(i + 1);
        // Animate the tapped star and reset others
        scaleAnims.forEach((a, idx) => {
            if (idx === i) {
                Animated.sequence([
                    Animated.spring(a, { toValue: 1.5, useNativeDriver: true }),
                    Animated.spring(a, { toValue: 1,   useNativeDriver: true }),
                ]).start();
            } else {
                Animated.spring(a, { toValue: 1, useNativeDriver: true }).start();
            }
        });
    };

    const meta = selected > 0 ? RATING_META[selected - 1] : null;

    return (
        <Modal visible={visible} transparent animationType="none" onShow={onShow}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.overlay}
            >
                <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />

                <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
                    {/* Handle indicator */}
                    <View style={styles.handle} />

                    {/* Provider emoji header */}
                    <View style={styles.iconRow}>
                        <LinearGradient colors={GRADIENTS.brand} style={styles.iconCircle}>
                            <Text style={styles.iconText}>⭐</Text>
                        </LinearGradient>
                    </View>

                    <Text style={styles.title}>Rate Your Experience</Text>
                    <Text style={styles.subtitle}>How was your service with{'\n'}<Text style={styles.providerName}>{providerName}</Text>?</Text>

                    {/* Star row */}
                    <View style={styles.starRow}>
                        {[0, 1, 2, 3, 4].map(i => (
                            <TouchableOpacity key={i} onPress={() => handleStar(i)} activeOpacity={0.8}>
                                <Animated.Text style={[
                                    styles.star,
                                    { transform: [{ scale: scaleAnims[i] }] },
                                    i < selected ? styles.starActive : styles.starEmpty,
                                ]}>
                                    ★
                                </Animated.Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Rating label */}
                    {meta && (
                        <Animated.View style={styles.ratingLabelWrap}>
                            <Text style={styles.ratingEmoji}>{meta.emoji}</Text>
                            <Text style={[styles.ratingLabel, { color: meta.color }]}>{meta.label}</Text>
                        </Animated.View>
                    )}

                    {/* Review input */}
                    <View style={[styles.inputWrap, inputFocused && styles.inputWrapFocused]}>
                        <TextInput
                            style={styles.input}
                            placeholder="Leave a comment (optional)…"
                            placeholderTextColor={T.placeholder}
                            value={review}
                            onChangeText={setReview}
                            onFocus={() => setInputFocused(true)}
                            onBlur={() => setInputFocused(false)}
                            multiline
                            maxLength={200}
                        />
                        {review.length > 0 && (
                            <Text style={styles.charCount}>{review.length}/200</Text>
                        )}
                    </View>

                    {/* Submit button */}
                    <TouchableOpacity
                        style={[styles.submitWrap, !selected && styles.submitDisabled]}
                        onPress={() => selected > 0 && onSubmit(selected, review)}
                        disabled={!selected}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={meta ? [meta.color, meta.color + 'CC'] : GRADIENTS.brand}
                            style={styles.submitBtn}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.submitText}>Submit Rating  →</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <Text style={styles.disclaimer}>Your rating is anonymous and helps improve service quality.</Text>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const makeStyles = (T) => StyleSheet.create({
    overlay:  { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.75)' },

    sheet: {
        backgroundColor: T.card,
        borderTopLeftRadius: T.r7,
        borderTopRightRadius: T.r7,
        paddingHorizontal: T.sp6,
        paddingBottom: T.sp10,
        borderTopWidth: 1,
        borderColor: T.border,
        alignItems: 'center',
    },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: T.border, marginTop: T.sp3, marginBottom: T.sp4 },

    iconRow:    { marginBottom: T.sp4 },
    iconCircle: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', ...SHADOWS.btn },
    iconText:   { fontSize: 36 },

    title:        { ...T.fH1, color: T.textLight, marginBottom: T.sp2 },
    subtitle:     { ...T.fBody, color: T.sub, textAlign: 'center', marginBottom: T.sp6, lineHeight: 22 },
    providerName: { color: '#1A6BFF', fontWeight: '700' },

    starRow:    { flexDirection: 'row', gap: T.sp3, marginBottom: T.sp3 },
    star:       { fontSize: 44 },
    starActive: { color: '#F5A623' },
    starEmpty:  { color: T.elevated },

    ratingLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: T.sp2, marginBottom: T.sp4 },
    ratingEmoji:     { fontSize: 20 },
    ratingLabel:     { ...T.fH3, fontWeight: '700' },

    inputWrap: {
        width: '100%',
        backgroundColor: T.elevated,
        borderRadius: T.r3,
        padding: T.sp4,
        borderWidth: 1.5,
        borderColor: T.border,
        marginBottom: T.sp4,
        minHeight: 88,
    },
    inputWrapFocused: { borderColor: '#1A6BFF' },
    input:      { ...T.fBody, color: T.textLight, textAlignVertical: 'top', minHeight: 60 },
    charCount:  { ...T.fCaption, color: T.sub, alignSelf: 'flex-end', marginTop: T.sp2 },

    submitWrap:    { width: '100%', borderRadius: T.r3, overflow: 'hidden', marginBottom: T.sp3, ...SHADOWS.btn },
    submitDisabled:{ opacity: 0.4 },
    submitBtn:     { height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: T.r3 },
    submitText:    { ...T.fH3, color: '#fff', fontWeight: '700' },

    disclaimer: { ...T.fCaption, color: T.sub, textAlign: 'center' },
});
