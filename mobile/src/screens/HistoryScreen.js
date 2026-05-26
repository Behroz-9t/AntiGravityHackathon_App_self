import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView,
    TouchableOpacity, Animated, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getTheme, getGradients, SHADOWS } from '../theme';
import { useBookings } from '../BookingContext';

const STATUS_META = {
    Completed: { bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.3)',   text: '#22C55E', icon: '✅' },
    Started:   { bg: 'rgba(26,107,255,0.1)',   border: 'rgba(26,107,255,0.3)',  text: '#1A6BFF', icon: '🔵' },
    Pending:   { bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.3)',  text: '#F59E0B', icon: '⏳' },
    Arriving:  { bg: 'rgba(26,107,255,0.1)',   border: 'rgba(26,107,255,0.3)',  text: '#1A6BFF', icon: '🚗' },
    Working:   { bg: 'rgba(139,92,246,0.1)',   border: 'rgba(139,92,246,0.3)',  text: '#8B5CF6', icon: '🔧' },
    Cancelled: { bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.3)',   text: '#EF4444', icon: '❌' },
    Scheduled: { bg: 'rgba(212,175,55,0.1)',   border: 'rgba(212,175,55,0.3)',  text: '#D4AF37', icon: '⏰' },
};

const SERVICE_ICONS = {
    'plumber':       '🔧',
    'electrician':   '⚡',
    'ac repair':     '❄️',
    'cleaning':      '✨',
    'carpenter':     '🪑',
    'pest control':  '🐛',
};

function getServiceIcon(service) {
    if (!service) return '🔨';
    const key = Object.keys(SERVICE_ICONS).find(k => service.toLowerCase().includes(k));
    return key ? SERVICE_ICONS[key] : '🔨';
}

/* ─── Status badge ──────────────────────────────────────────────────────── */
function StatusBadge({ status }) {
    const m = STATUS_META[status] ?? STATUS_META.Pending;
    return (
        <View style={[badge.wrap, { backgroundColor: m.bg, borderColor: m.border }]}>
            <Text style={badge.icon}>{m.icon}</Text>
            <Text style={[badge.text, { color: m.text }]}>{status}</Text>
        </View>
    );
}
const badge = StyleSheet.create({
    wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
    icon: { fontSize: 11 },
    text: { fontSize: 11, fontWeight: '700' },
});

/* ─── Star display ──────────────────────────────────────────────────────── */
function StarDisplay({ rating }) {
    const { isDarkMode } = useBookings();
    const T = getTheme(isDarkMode);
    if (!rating) return null;
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            {[1,2,3,4,5].map(i => (
                <Text key={i} style={{ fontSize: 16, color: i <= rating ? '#F5A623' : T.elevated, opacity: i <= rating ? 1 : 0.5 }}>★</Text>
            ))}
            <Text style={{ ...T.fCaption, color: '#F5A623', fontWeight: '700', marginLeft: 4 }}>{rating.toFixed(1)}</Text>
        </View>
    );
}

/* ─── Booking card ──────────────────────────────────────────────────────── */
function BookingCard({ booking, slideAnim, navigation }) {
    const { isDarkMode } = useBookings();
    const T = getTheme(isDarkMode);
    const styles = makeStyles(T);
    const svcIcon = getServiceIcon(booking.service);
    const sm = STATUS_META[booking.status] ?? STATUS_META.Pending;
    const active = ['Pending', 'Arriving', 'Working', 'Scheduled'].includes(booking.status);

    const cardContent = (
        <View style={{ flex: 1 }}>
            <View style={styles.cardTop}>
                {/* Service icon */}
                <View style={[styles.svcIconWrap, { backgroundColor: sm.text + '15' }]}>
                    <Text style={styles.svcIconText}>{svcIcon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.cardProvider, { color: T.textLight }]}>{booking.provider?.provider_name ?? booking.provider}</Text>
                    {booking.service && <Text style={[styles.cardService, { color: T.sub }]}>{booking.service}</Text>}
                </View>
                <StatusBadge status={booking.status} />
            </View>

            <View style={[styles.divider, { backgroundColor: T.border }]} />

            <View style={styles.cardMeta}>
                <View style={styles.metaItem}>
                    <Text style={styles.metaIcon}>📅</Text>
                    <Text style={[styles.metaText, { color: T.sub }]}>{booking.date}</Text>
                </View>
                <View style={styles.metaItem}>
                    <Text style={styles.metaIcon}>🆔</Text>
                    <Text style={[styles.metaText, { color: T.sub }]}>{booking.id?.slice(-8) ?? '—'}</Text>
                </View>
            </View>

            {booking.bookingMeta?.isForOthers || booking.bookingMeta?.recipientAddress ? (
                <View style={styles.bookingForOthersTag}>
                    <Text style={styles.bookingForOthersText} numberOfLines={1}>
                        👥 For: {booking.bookingMeta.recipientName || 'N/A'} ({booking.bookingMeta.recipientPhone || 'N/A'})
                    </Text>
                </View>
            ) : null}

            {booking.rating ? (
                <View style={[styles.ratingRow, { borderColor: T.border }]}>
                    <Text style={[styles.ratingLabel, { color: T.sub }]}>Your Rating</Text>
                    <StarDisplay rating={booking.rating} />
                </View>
            ) : booking.status === 'Completed' ? (
                <View style={styles.completedRow}>
                    <Text style={styles.completedText}>✅ Service completed successfully</Text>
                </View>
            ) : booking.status === 'Cancelled' ? (
                <View style={[styles.completedRow, { marginTop: 6 }]}>
                    <Text style={{ color: '#EF4444', fontSize: 12, fontStyle: 'italic' }}>
                        ❌ Cancelled: {booking.cancelReason || 'User request'}
                    </Text>
                </View>
            ) : (
                <View style={styles.trackLiveContainer}>
                    <Text style={styles.trackLiveText}>➡️ Tap to track live status updates</Text>
                </View>
            )}
        </View>
    );

    return (
        <Animated.View style={[styles.card, { backgroundColor: T.card, borderColor: T.border, opacity: slideAnim, transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
            {active && navigation ? (
                <TouchableOpacity 
                    activeOpacity={0.85} 
                    onPress={() => navigation.navigate('Tracking', {
                        bookingId: booking.id,
                        bookingData: booking,
                        intentData: { service: booking.service, location: booking.bookingMeta?.recipientAddress },
                        providerData: booking.provider,
                        bookingMeta: booking.bookingMeta
                    })}
                >
                    {cardContent}
                </TouchableOpacity>
            ) : (
                cardContent
            )}
        </Animated.View>
    );
}

/* ─── Main screen ───────────────────────────────────────────────────────── */
export default function HistoryScreen({ navigation }) {
    const { bookings, isDarkMode } = useBookings();
    const T = getTheme(isDarkMode);
    const G = getGradients(isDarkMode);
    const styles = makeStyles(T);
    const fadeAnim  = useRef(new Animated.Value(0)).current;
    const cardAnims = useRef(bookings.map(() => new Animated.Value(0))).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        bookings.forEach((_, i) => {
            setTimeout(() => {
                Animated.spring(cardAnims[i] ?? new Animated.Value(0), { toValue: 1, useNativeDriver: true }).start();
            }, i * 80);
        });
    }, []);

    const completed  = bookings.filter(b => b.status === 'Completed').length;
    const inProgress = bookings.filter(b => ['Arriving','Working','Pending','Scheduled'].includes(b.status)).length;

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]}>
            {/* Header */}
            <LinearGradient colors={G.dark} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnWrap}>
                    <View style={[styles.backBtn, { backgroundColor: T.elevated }]}>
                        <Text style={[styles.backText, { color: T.textLight }]}>←</Text>
                    </View>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.headerTitle, { color: T.textLight }]}>My Bookings</Text>
                    <Text style={[styles.headerSub, { color: T.sub, marginTop: 2 }]}>{bookings.length} total  ·  {inProgress} active</Text>
                </View>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{bookings.length}</Text>
                </View>
            </LinearGradient>

            {/* Summary bar */}
            {bookings.length > 0 && (
                <Animated.View style={[styles.summaryBar, { opacity: fadeAnim, backgroundColor: T.card, borderColor: T.border }]}>
                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryNum, { color: '#1A6BFF' }]}>{bookings.length}</Text>
                        <Text style={[styles.summaryLabel, { color: T.sub, marginTop: 2 }]}>Total</Text>
                    </View>
                    <View style={[styles.summaryDivider, { backgroundColor: T.border }]} />
                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryNum, { color: T.success }]}>{completed}</Text>
                        <Text style={[styles.summaryLabel, { color: T.sub, marginTop: 2 }]}>Completed</Text>
                    </View>
                    <View style={[styles.summaryDivider, { backgroundColor: T.border }]} />
                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryNum, { color: T.warning }]}>{inProgress}</Text>
                        <Text style={[styles.summaryLabel, { color: T.sub, marginTop: 2 }]}>Active</Text>
                    </View>
                </Animated.View>
            )}

            <Animated.ScrollView
                style={{ flex: 1, opacity: fadeAnim }}
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {bookings.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={[styles.emptyIconWrap, { backgroundColor: T.card, borderColor: T.border }]}>
                            <Text style={styles.emptyEmoji}>📋</Text>
                        </View>
                        <Text style={[styles.emptyTitle, { color: T.textLight, marginBottom: T.sp2 }]}>No Bookings Yet</Text>
                        <Text style={[styles.emptySub, { color: T.sub }]}>Book a home service to see your history and status updates here.</Text>
                        <TouchableOpacity style={styles.emptyBtnWrap} onPress={() => navigation.navigate('Home')}>
                            <LinearGradient colors={G.brand} style={styles.emptyBtn}>
                                <Text style={styles.emptyBtnText}>Find a Service  →</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                ) : (
                    bookings.map((b, i) => (
                        <BookingCard
                            key={b.id}
                            booking={b}
                            slideAnim={cardAnims[i] ?? new Animated.Value(1)}
                            navigation={navigation}
                        />
                    ))
                )}
                <View style={{ height: T.sp10 }} />
            </Animated.ScrollView>
        </SafeAreaView>
    );
}

const makeStyles = (T) => StyleSheet.create({
    safe: { flex: 1, backgroundColor: T.bg },

    // Header
    header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: T.sp5, paddingVertical: T.sp4, paddingTop: Platform.OS === 'android' ? 48 : T.sp4, gap: T.sp3 },
    backBtnWrap:  {},
    backBtn:      { width: 40, height: 40, borderRadius: T.r2, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
    backText:     { color: '#fff', fontSize: 20, fontWeight: '700' },
    headerTitle:  { ...T.fH2, color: T.textLight },
    headerSub:    { ...T.fCaption, color: T.sub, marginTop: 2 },
    countBadge:   { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(26,107,255,0.15)', borderWidth: 1, borderColor: 'rgba(26,107,255,0.3)', justifyContent: 'center', alignItems: 'center' },
    countText:    { ...T.fBody, color: '#1A6BFF', fontWeight: '800' },

    // Summary bar
    summaryBar:     { flexDirection: 'row', backgroundColor: T.card, paddingVertical: T.sp4, borderBottomWidth: 1, borderColor: T.border },
    summaryItem:    { flex: 1, alignItems: 'center' },
    summaryNum:     { ...T.fH1, fontWeight: '700' },
    summaryLabel:   { ...T.fCaption, color: T.sub, marginTop: 2 },
    summaryDivider: { width: 1, backgroundColor: T.border },

    scroll: { paddingHorizontal: T.sp5, paddingTop: T.sp4 },

    // Empty state
    emptyState:   { flex: 1, alignItems: 'center', paddingTop: 80 },
    emptyIconWrap:{ width: 96, height: 96, borderRadius: 48, backgroundColor: T.card, borderWidth: 1, borderColor: T.border, justifyContent: 'center', alignItems: 'center', marginBottom: T.sp4 },
    emptyEmoji:   { fontSize: 40 },
    emptyTitle:   { ...T.fH2, color: T.textLight, marginBottom: T.sp2 },
    emptySub:     { ...T.fBody, color: T.sub, textAlign: 'center', marginBottom: T.sp6, paddingHorizontal: T.sp4 },
    emptyBtnWrap: { borderRadius: T.r3, overflow: 'hidden', ...SHADOWS.btn },
    emptyBtn:     { paddingHorizontal: T.sp8, paddingVertical: T.sp4, borderRadius: T.r3 },
    emptyBtnText: { ...T.fH3, color: '#fff', fontWeight: '700' },

    // Card
    card: {
        backgroundColor: T.card,
        borderRadius: T.r5,
        padding: T.sp4,
        marginBottom: T.sp3,
        borderWidth: 1,
        borderColor: T.border,
        overflow: 'hidden',
        ...SHADOWS.card,
    },
    cardTop:     { flexDirection: 'row', alignItems: 'center', gap: T.sp3 },
    svcIconWrap: { width: 48, height: 48, borderRadius: T.r2, justifyContent: 'center', alignItems: 'center' },
    svcIconText: { fontSize: 24 },
    cardProvider:{ ...T.fH3, color: T.textLight },
    cardService: { ...T.fCaption, color: T.sub, marginTop: 2 },

    divider: { height: 1, backgroundColor: T.border, marginVertical: T.sp3 },

    cardMeta:  { flexDirection: 'row', gap: T.sp5 },
    metaItem:  { flexDirection: 'row', alignItems: 'center', gap: T.sp1 },
    metaIcon:  { fontSize: 12 },
    metaText:  { ...T.fCaption, color: T.sub },

    bookingForOthersTag: {
        backgroundColor: 'rgba(245, 197, 24, 0.08)',
        borderRadius: T.r2,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginTop: T.sp3,
        alignSelf: 'flex-start',
    },
    bookingForOthersText: {
        color: T.accent1,
        fontSize: 10,
        fontWeight: '700',
    },

    ratingRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: T.sp3, paddingTop: T.sp3, borderTopWidth: 1, borderColor: T.border },
    ratingLabel:   { ...T.fCaption, color: T.sub, fontWeight: '600' },
    completedRow:  { marginTop: T.sp2 },
    completedText: { ...T.fCaption, color: T.success },
    trackLiveContainer: {
        backgroundColor: 'rgba(245, 197, 24, 0.08)',
        borderRadius: T.r2,
        paddingHorizontal: 8,
        paddingVertical: 6,
        marginTop: T.sp3,
        borderWidth: 1,
        borderColor: 'rgba(245, 197, 24, 0.25)',
    },
    trackLiveText: {
        color: T.accent1,
        fontSize: 10,
        fontWeight: '700',
        textAlign: 'center',
    },
});
