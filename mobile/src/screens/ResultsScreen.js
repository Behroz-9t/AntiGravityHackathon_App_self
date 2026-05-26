import React, { useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView,
    TouchableOpacity, Animated, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getTheme, getGradients, SHADOWS } from '../theme';
import { useBookings } from '../BookingContext';

/* ─── Stat box ──────────────────────────────────────────────────────────── */
function StatBox({ icon, label, value, color }) {
    const { isDarkMode } = useBookings();
    const T = getTheme(isDarkMode);
    const styles = makeStyles(T);
    return (
        <View style={[styles.statBox, { borderColor: color + '30', backgroundColor: color + '0D' }]}>
            <Text style={{ fontSize: 20, marginBottom: 4 }}>{icon}</Text>
            <Text style={[styles.statValue, { color }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: T.sub }]}>{label}</Text>
        </View>
    );
}

/* ─── Alternative provider row ──────────────────────────────────────────── */
function AltRow({ p, rank }) {
    const { isDarkMode } = useBookings();
    const T = getTheme(isDarkMode);
    const G = getGradients(isDarkMode);
    const styles = makeStyles(T);
    const rankIcon = rank === 0 ? '🥇' : rank === 1 ? '🥈' : '🥉';
    const isTop = rank === 0;
    return (
        <View style={[styles.altRow, { backgroundColor: T.card, borderColor: T.border }, isTop && styles.altRowTop]}>
            {isTop && <LinearGradient colors={['rgba(245,197,24,0.12)','rgba(245,197,24,0.04)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />}
            {isTop && <View style={styles.altAccentBar} />}
            <View style={[styles.altRankBadge, { backgroundColor: T.elevated }]}>
                <Text style={{ fontSize: 18 }}>{rankIcon}</Text>
            </View>
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.altName, { color: T.textLight }]}>{p.provider_name}</Text>
                    {!p.available && (
                        <View style={styles.unavailPill}>
                            <Text style={[styles.unavailText, { color: T.error }]}>Unavailable</Text>
                        </View>
                    )}
                </View>
                <Text style={[styles.altLocation, { color: T.sub }]}>{p.location}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={styles.altRating}>⭐ {p.rating}</Text>
                <Text style={styles.altDist}>{p.distance_km} km</Text>
                <Text style={[styles.altEta, { color: T.sub }]}>{p.estimated_arrival}</Text>
            </View>
        </View>
    );
}

/* ─── Main Screen ───────────────────────────────────────────────────────── */
export default function ResultsScreen({ route, navigation }) {
    const { data, bookingMeta = {} } = route.params ?? {};
    const { isDarkMode } = useBookings();
    const T = getTheme(isDarkMode);
    const G = getGradients(isDarkMode);
    const styles = makeStyles(T);
    const provider      = data?.ranking?.selected_provider;
    const allProviders  = data?.discovered_providers ?? [];
    const intent        = data?.intent  ?? {};
    const booking       = data?.booking ?? {};

    const fadeAnim  = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(32)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim,  { toValue: 1,  duration: 500, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0,  useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1,  useNativeDriver: true }),
        ]).start();
    }, []);

    if (!provider) {
        return (
            <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]}>
                <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>🔍</Text>
                    <Text style={[styles.emptyTitle, { color: T.textLight }]}>No Providers Found</Text>
                    <Text style={[styles.emptySub, { color: T.sub }]}>We couldn't find a matching service provider nearby. Try broadening your search.</Text>
                    <TouchableOpacity style={styles.retryWrap} onPress={() => navigation.navigate('Home')}>
                        <LinearGradient colors={G.brand} style={styles.retryBtn}>
                            <Text style={styles.retryText}>Search Again</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const nearby = allProviders.filter(p => p.id !== provider.id).slice(0, 3);

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]}>
            {/* Header */}
            <LinearGradient colors={G.dark} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <View style={[styles.backBtnInner, { backgroundColor: T.elevated }]}>
                        <Text style={[styles.backText, { color: T.textLight }]}>←</Text>
                    </View>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.headerTitle, { color: T.textLight }]}>Best Match</Text>
                    <Text style={[styles.headerSub, { color: T.sub, marginTop: 2 }]}>{allProviders.length} providers found nearby</Text>
                </View>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>#{allProviders.findIndex(p => p.id === provider.id) + 1} Ranked</Text>
                </View>
            </LinearGradient>

            <Animated.ScrollView
                style={{ flex: 1, opacity: fadeAnim }}
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Winner hero card ──────────────────────────────────── */}
                <Animated.View style={{ transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
                    <LinearGradient colors={G.darkCard} style={[styles.winnerCard, { borderColor: 'rgba(245,197,24,0.16)' }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                        {/* Glow orbs */}
                        <View style={styles.glowOrb1} />
                        <View style={styles.glowOrb2} />

                        <View style={styles.winnerTop}>
                            <View style={styles.winnerAvatarWrap}>
                                <LinearGradient colors={G.brand} style={styles.winnerAvatar}>
                                    <Text style={styles.winnerAvatarText}>{provider.provider_name[0]}</Text>
                                </LinearGradient>
                                {/* Online status */}
                                <View style={[styles.onlineDot, { backgroundColor: provider.available ? T.success : T.error, borderColor: '#15181F' }]} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <LinearGradient colors={G.accent} style={styles.aiBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                    <Text style={styles.aiBadgeText}>🏆  AI Recommended</Text>
                                </LinearGradient>
                                <Text style={[styles.winnerName, { color: T.textLight }]}>{provider.provider_name}</Text>
                                <Text style={[styles.winnerService, { color: T.sub }]}>{intent.service}  •  {provider.location}</Text>
                            </View>
                        </View>

                        <View style={styles.statRow}>
                            <StatBox icon="⭐" label="Rating"    value={provider.rating}                    color="#F5A623" />
                            <StatBox icon="📍" label="Distance"  value={provider.distance_km + ' km'}        color="#F5C518" />
                            <StatBox icon="⏱"  label="ETA"       value={provider.estimated_arrival}          color="#F5C518" />
                            <StatBox icon="⚡" label="Response"  value={provider.response_time_mins + ' min'} color="#22C55E" />
                        </View>

                        {!provider.available && (
                            <View style={styles.warnBanner}>
                                <Text style={styles.warnText}>⚠  Provider is currently busy — booking adds you to queue</Text>
                            </View>
                        )}
                    </LinearGradient>
                </Animated.View>

                {/* ── Primary CTA ──────────────────────────────────────── */}
                <TouchableOpacity
                    style={styles.bookWrap}
                    onPress={() => navigation.navigate('Booking', { data, bookingMeta })}
                    activeOpacity={0.9}
                >
                    <LinearGradient colors={G.brand} style={styles.bookBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.bookBtnLabel}>Confirm & Book</Text>
                            <Text style={styles.bookBtnSub}>Track in real-time on map</Text>
                        </View>
                        <View style={styles.bookBtnArrow}>
                            <Text style={{ color: '#fff', fontSize: 22 }}>🚀</Text>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>

                {/* ── Nearby alternatives ───────────────────────────────── */}
                {nearby.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: T.textLight }]}>Nearby Alternatives</Text>
                            <View style={styles.kmBadge}>
                                <Text style={styles.kmBadgeText}>≤50 km radius</Text>
                            </View>
                        </View>
                        {nearby.map((p, i) => <AltRow key={p.id} p={p} rank={i + 1} />)}
                    </View>
                )}

                <View style={{ height: T.sp10 }} />
            </Animated.ScrollView>
        </SafeAreaView>
    );
}

const makeStyles = (T) => StyleSheet.create({
    safe: { flex: 1, backgroundColor: T.bg },

    // Empty state
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: T.sp8 },
    emptyEmoji: { fontSize: 64, marginBottom: T.sp4 },
    emptyTitle: { ...T.fH1, color: T.textLight, marginBottom: T.sp2 },
    emptySub:   { ...T.fBody, color: T.sub, textAlign: 'center', marginBottom: T.sp6 },
    retryWrap:  { borderRadius: T.r3, overflow: 'hidden', ...SHADOWS.btn },
    retryBtn:   { paddingHorizontal: T.sp8, paddingVertical: T.sp4, borderRadius: T.r3 },
    retryText:  { ...T.fH3, color: '#fff', fontWeight: '700' },

    // Header
    header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: T.sp5, paddingVertical: T.sp4, paddingTop: Platform.OS === 'android' ? 48 : T.sp4, gap: T.sp3 },
    backBtn:      {},
    backBtnInner: { width: 40, height: 40, borderRadius: T.r2, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
    backText:     { color: '#fff', fontSize: 20, fontWeight: '700' },
    headerTitle:  { ...T.fH2, color: T.textLight },
    headerSub:    { ...T.fCaption, color: T.sub, marginTop: 2 },
    countBadge:   { backgroundColor: 'rgba(245,197,24,0.15)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(245,197,24,0.3)' },
    countText:    { ...T.fCaption, color: '#F5C518', fontWeight: '700' },

    scroll: { paddingHorizontal: T.sp5, paddingTop: T.sp4 },
    section: { marginTop: T.sp4 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: T.sp3 },
    sectionTitle:  { ...T.fH3, color: T.textLight },
    kmBadge:       { backgroundColor: 'rgba(245,197,24,0.1)', borderRadius: 10, paddingHorizontal: T.sp3, paddingVertical: T.sp1, borderWidth: 1, borderColor: 'rgba(245,197,24,0.2)' },
    kmBadgeText:   { ...T.fCaption, color: '#F5C518', fontWeight: '700' },

    // Winner card
    winnerCard:   { borderRadius: T.r7, padding: T.sp6, marginBottom: T.sp4, borderWidth: 1, borderColor: 'rgba(245,197,24,0.16)', overflow: 'hidden', ...SHADOWS.focus },
    glowOrb1:     { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(245,197,24,0.05)', top: -40, right: -40 },
    glowOrb2:     { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(245,197,24,0.03)', bottom: 20, left: -20 },
    winnerTop:    { flexDirection: 'row', alignItems: 'flex-start', gap: T.sp4, marginBottom: T.sp5 },
    winnerAvatarWrap: { position: 'relative' },
    winnerAvatar: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
    winnerAvatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
    onlineDot:    { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#15181F' },
    aiBadge:      { borderRadius: 10, paddingHorizontal: T.sp3, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: T.sp2 },
    aiBadgeText:  { ...T.fCaption, color: '#fff', fontWeight: '700' },
    winnerName:   { ...T.fH1, color: '#fff', marginBottom: 4 },
    winnerService:{ ...T.fCaption, color: 'rgba(255,255,255,0.6)' },
    statRow:      { flexDirection: 'row', gap: T.sp2, flexWrap: 'wrap', marginBottom: T.sp3 },
    statBox:      { flex: 1, minWidth: '22%', borderRadius: T.r2, padding: T.sp3, alignItems: 'center', borderWidth: 1 },
    statValue:    { ...T.fBody, fontWeight: '800' },
    statLabel:    { ...T.fCaption, color: T.sub, marginTop: 2 },
    warnBanner:   { backgroundColor: 'rgba(245,158,11,0.12)', borderRadius: T.r2, padding: T.sp3, borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)' },
    warnText:     { ...T.fCaption, color: T.warning },

    // Book CTA
    bookWrap:   { borderRadius: T.r5, overflow: 'hidden', marginBottom: T.sp4, ...SHADOWS.btn },
    bookBtn:    { flexDirection: 'row', alignItems: 'center', padding: T.sp5, borderRadius: T.r5 },
    bookBtnLabel: { ...T.fH3, color: '#fff', fontWeight: '700' },
    bookBtnSub:   { ...T.fCaption, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    bookBtnArrow: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },

    // Alt rows
    altRow:      { backgroundColor: T.card, borderRadius: T.r4, padding: T.sp4, marginBottom: T.sp2, borderWidth: 1, borderColor: T.border, flexDirection: 'row', alignItems: 'center', gap: T.sp3, overflow: 'hidden', ...SHADOWS.card },
    altRowTop:   { borderColor: 'rgba(245,197,24,0.25)' },
    altAccentBar:{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: '#F5C518' },
    altRankBadge:{ width: 36, height: 36, borderRadius: 18, backgroundColor: T.elevated, justifyContent: 'center', alignItems: 'center' },
    altName:     { ...T.fH3, color: T.textLight },
    altLocation: { ...T.fCaption, color: T.sub, marginTop: 2 },
    altRating:   { ...T.fCaption, color: '#F5A623', fontWeight: '700' },
    altDist:     { ...T.fCaption, color: '#F5C518', fontWeight: '600' },
    altEta:      { ...T.fCaption, color: T.sub },
    unavailPill: { backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
    unavailText: { ...T.fCaption, color: T.error, fontWeight: '700' },
});
