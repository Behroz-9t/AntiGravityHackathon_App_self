import React, { useState } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
    ScrollView, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useBookings } from '../BookingContext';
import { getTheme, getGradients } from '../theme';
import {
    sendImmediateNotification,
    scheduleReminderNotification,
} from '../notifications';
import { parseTimeSlot } from './TrackingScreen';

const C = {
    bg: '#0A0B0D', card: 'rgba(18, 20, 23, 0.95)', border: 'rgba(255, 255, 255, 0.08)',
    text: '#F8FAFC', sub: '#94A3B8', primary: '#38BDF8', gold: '#D4AF37',
};

export default function BookingScreen({ route, navigation }) {
    const { data, bookingMeta = {} } = route.params ?? {};
    const { addBooking, isDarkMode } = useBookings();
    const T = getTheme(isDarkMode);
    const G = getGradients(isDarkMode);
    const styles = makeStyles(T);
    const [confirmed, setConfirmed] = useState(false);
    const [fadeAnim] = useState(new Animated.Value(1));

    const booking  = data?.booking;
    const intent   = data?.intent;
    const provider = data?.ranking?.selected_provider;

    if (!booking || !provider) {
        return (
            <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]}>
                <View style={styles.center}>
                    <Text style={styles.errorText}>⚠️ No booking data found.</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Home')} style={[styles.backBtn, { backgroundColor: T.elevated }]}>
                        <Text style={[styles.backBtnText, { color: T.textLight }]}>Go Home</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const handleConfirm = async () => {
        setConfirmed(true);
        const entry = addBooking(booking, intent, bookingMeta, data);

        const providerName = provider?.provider_name ?? 'your provider';
        const service      = intent?.service ?? 'service';
        const timeSlot     = bookingMeta.timeSlot || 'Immediate';
        const userPhone    = bookingMeta.userPhone || bookingMeta.recipientPhone;
        const isScheduled  = timeSlot && !/immediate|as soon as possible/i.test(timeSlot);

        // 1. Booking confirmation push notification (immediate, always)
        await sendImmediateNotification(
            '✅ Booking Confirmed — ???? ??',
            `${providerName} is assigned for your ${service} — ${timeSlot}.`
        );

        // 2. Schedule 2-hour reminder for non-immediate slots
        if (isScheduled) {
            const slotDate = parseTimeSlot(timeSlot);
            if (slotDate) {
                await scheduleReminderNotification(
                    '⏰ Upcoming Booking — ???? ??',
                    `Reminder: ${providerName} is arriving in 2 hours for your ${service} at ${timeSlot}.`,
                    slotDate
                );
            }
        }

        Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
            navigation.replace('ProviderChat', {
                bookingId: entry.id,
                bookingData: booking,
                intentData: intent,
                providerData: provider,
                bookingMeta,
                userLat: data?.user_lat,
                userLng: data?.user_lng,
                isOngoingFlow: true,
            });
        });
    };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]}>
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                {/* Header */}
                <LinearGradient colors={G.dark} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
                        <Text style={[styles.headerBackText, { color: T.textLight }]}>←</Text>
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: T.textLight }]}>Confirm Booking</Text>
                    <View style={{ width: 40 }} />
                </LinearGradient>

                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    {/* Provider banner */}
                    <LinearGradient colors={G.darkCard} style={styles.providerBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                        <View style={[styles.avatarCircle, { backgroundColor: isDarkMode ? 'rgba(56,189,248,0.12)' : 'rgba(56,189,248,0.06)', borderColor: '#38BDF8' }]}>
                            <Text style={styles.avatarText}>{provider.provider_name[0]}</Text>
                        </View>
                        <Text style={[styles.bannerName, { color: T.textLight }]}>{provider.provider_name}</Text>
                        <Text style={[styles.bannerService, { color: T.sub }]}>{intent?.service}</Text>
                        <View style={styles.bannerMeta}>
                            <View style={[styles.metaChip, { backgroundColor: T.elevated, borderColor: T.border }]}><Text style={[styles.metaChipText, { color: T.textLight }]}>★ {provider.rating}</Text></View>
                            <View style={[styles.metaChip, { backgroundColor: T.elevated, borderColor: T.border }]}><Text style={[styles.metaChipText, { color: T.textLight }]}>📍 {provider.location}</Text></View>
                            <View style={[styles.metaChip, { backgroundColor: T.elevated, borderColor: T.border }]}><Text style={[styles.metaChipText, { color: T.textLight }]}>⏱ {provider.estimated_arrival}</Text></View>
                        </View>
                    </LinearGradient>

                    {/* Booking details */}
                    <View style={[styles.detailCard, { backgroundColor: T.card, borderColor: T.border }]}>
                        <Text style={[styles.detailTitle, { color: T.textLight }]}>Booking Details</Text>
                        {[
                            ['Booking ID', booking.booking_id],
                            ['Service',    intent?.service ?? 'N/A'],
                            ['Location',   intent?.location ?? 'GPS-based'],
                            ['Time Slot',  bookingMeta.timeSlot || (booking.time_slot !== 'unknown' ? booking.time_slot : 'Immediate')],
                            ['Status',     booking.status],
                        ].map(([label, value]) => (
                            <View key={label} style={[styles.detailRow, { borderBottomColor: T.border }]}>
                                <Text style={[styles.detailLabel, { color: T.sub }]}>{label}</Text>
                                <Text style={[styles.detailValue, { color: T.textLight }]}>{value}</Text>
                            </View>
                        ))}

                        {/* Notification pills */}
                        <View style={styles.notifPill}>
                            <Text style={styles.notifPillText}>🔔 Push Notification — Booking confirmation sent on confirm</Text>
                        </View>
                        {bookingMeta.timeSlot && !/immediate|as soon as possible/i.test(bookingMeta.timeSlot) && (
                            <View style={[styles.notifPill, { backgroundColor: 'rgba(139,92,246,0.07)', borderColor: 'rgba(139,92,246,0.25)' }]}>
                                <Text style={[styles.notifPillText, { color: '#8B5CF6' }]}>⏰ Reminder — 2 hours before {bookingMeta.timeSlot}</Text>
                            </View>
                        )}
                    </View>

                    {/* Contact Details Card */}
                    {(bookingMeta?.recipientName || bookingMeta?.recipientPhone || bookingMeta?.userPhone) ? (
                        <View style={[styles.detailCard, { backgroundColor: T.card, borderColor: T.border }]}>
                            {bookingMeta?.recipientAddress ? (
                                <>
                                    <Text style={[styles.detailTitle, { color: '#A78BFA' }]}>👥 Booking For Other</Text>
                                    <View style={[styles.detailRow, { borderBottomColor: T.border }]}>
                                        <Text style={[styles.detailLabel, { color: T.sub }]}>Recipient Name</Text>
                                        <Text style={[styles.detailValue, { color: T.textLight }]}>{bookingMeta.recipientName || 'N/A'}</Text>
                                    </View>
                                    <View style={[styles.detailRow, { borderBottomColor: T.border }]}>
                                        <Text style={[styles.detailLabel, { color: T.sub }]}>Recipient Phone</Text>
                                        <Text style={[styles.detailValue, { color: T.textLight }]}>{bookingMeta.recipientPhone || 'N/A'}</Text>
                                    </View>
                                    <View style={[styles.detailRow, { borderBottomColor: T.border }]}>
                                        <Text style={[styles.detailLabel, { color: T.sub }]}>Recipient Address</Text>
                                        <Text style={[styles.detailValue, { color: T.textLight }]}>{bookingMeta.recipientAddress}</Text>
                                    </View>
                                </>
                            ) : (
                                bookingMeta?.userPhone ? (
                                    <>
                                        <Text style={[styles.detailTitle, { color: '#38BDF8' }]}>📞 Contact Information</Text>
                                        <View style={[styles.detailRow, { borderBottomColor: T.border }]}>
                                            <Text style={[styles.detailLabel, { color: T.sub }]}>Your Phone</Text>
                                            <Text style={[styles.detailValue, { color: T.textLight }]}>{bookingMeta.userPhone}</Text>
                                        </View>
                                    </>
                                ) : null
                            )}
                        </View>
                    ) : null}

                    {/* Pricing estimate */}
                    <View style={[styles.priceCard, { backgroundColor: isDarkMode ? 'rgba(56,189,248,0.06)' : 'rgba(56,189,248,0.12)', borderColor: T.border }]}>
                        <Text style={[styles.priceLabel, { color: T.sub }]}>Estimated Cost</Text>
                        <Text style={styles.priceValue}>PKR 500 – 2,000</Text>
                        <Text style={[styles.priceSub, { color: T.sub }]}>Final price agreed on-site</Text>
                    </View>

                    {/* Confirm button */}
                    <TouchableOpacity
                        style={[styles.confirmBtn, confirmed && styles.confirmBtnDone]}
                        onPress={handleConfirm}
                        disabled={confirmed}
                    >
                        <LinearGradient colors={['#38BDF8','#0284C7']} style={styles.confirmGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                            <Text style={styles.confirmText}>{confirmed ? 'Connecting to Provider…' : 'Confirm & Chat with Provider  →'}</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Return to Home option for scheduled bookings */}
                    {bookingMeta.timeSlot && !/immediate|as soon as possible/i.test(bookingMeta.timeSlot) && (
                        <TouchableOpacity
                            style={[styles.scheduleHomeBtn, { backgroundColor: T.elevated, borderColor: T.border }, confirmed && styles.confirmBtnDone]}
                            onPress={async () => {
                                setConfirmed(true);
                                addBooking(booking, intent, bookingMeta, data);

                                const providerName = provider?.provider_name ?? 'your provider';
                                const service      = intent?.service ?? 'service';
                                const timeSlot     = bookingMeta.timeSlot || 'Immediate';
                                const userPhone    = bookingMeta.userPhone || bookingMeta.recipientPhone;

                                // Confirmation notification
                                await sendImmediateNotification(
                                    '✅ Booking Confirmed — ???? ??',
                                    `${providerName} is assigned for your ${service} — ${timeSlot}.`
                                );

                                // 2-hour reminder
                                const slotDate = parseTimeSlot(timeSlot);
                                if (slotDate) {
                                    await scheduleReminderNotification(
                                        '⏰ Upcoming Booking — ???? ??',
                                        `Reminder: ${providerName} is arriving in 2 hours for your ${service} at ${timeSlot}.`,
                                        slotDate
                                    );
                                }

                                navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
                            }}
                            disabled={confirmed}
                        >
                            <Text style={[styles.scheduleHomeText, { color: '#38BDF8' }]}>📅 Confirm & Go Home</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
                        <Text style={[styles.cancelText, { color: T.sub }]}>Cancel</Text>
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </Animated.View>
        </SafeAreaView>
    );
}

const makeStyles = (T) => {
    const isDark = T.bg === '#0A0B0D';
    return StyleSheet.create({
        safe: { flex: 1, backgroundColor: T.bg },
        center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        errorText: { color: '#EF4444', fontSize: 16, marginBottom: 20 },
        backBtn: { backgroundColor: '#38BDF8', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
        backBtnText: { color: '#000', fontWeight: '700' },

        header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, paddingTop: 48 },
        headerBack: { width: 40, height: 40, justifyContent: 'center' },
        headerBackText: { color: T.textLight, fontSize: 24 },
        headerTitle: { color: T.textLight, fontSize: 18, fontWeight: '700' },

        scroll: { padding: 16 },

        providerBanner: { borderRadius: 24, padding: 28, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: isDark ? 'rgba(124,58,237,0.3)' : 'rgba(124,58,237,0.15)' },
        avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: isDark ? 'rgba(56,189,248,0.12)' : 'rgba(56,189,248,0.06)', borderWidth: 2, borderColor: '#38BDF8', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
        avatarText: { color: '#38BDF8', fontSize: 30, fontWeight: '800' },
        bannerName: { color: T.textLight, fontSize: 20, fontWeight: '800', marginBottom: 4 },
        bannerService: { color: T.sub, fontSize: 13, marginBottom: 16 },
        bannerMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
        metaChip: { backgroundColor: T.elevated, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: T.border },
        metaChipText: { color: T.textLight, fontSize: 12 },

        detailCard: { backgroundColor: T.card, borderRadius: 20, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: T.border },
        detailTitle: { color: T.textLight, fontSize: 15, fontWeight: '700', marginBottom: 14 },
        detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.border },
        detailLabel: { color: T.sub, fontSize: 14 },
        detailValue: { color: T.textLight, fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right' },

        priceCard: { backgroundColor: isDark ? 'rgba(56,189,248,0.06)' : 'rgba(56,189,248,0.12)', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: T.border, alignItems: 'center' },
        priceLabel: { color: T.sub, fontSize: 13, marginBottom: 6 },
        priceValue: { color: '#38BDF8', fontSize: 24, fontWeight: '800' },
        priceSub: { color: T.sub, fontSize: 11, marginTop: 4 },

        confirmBtn: { borderRadius: 20, overflow: 'hidden', marginBottom: 12 },
        confirmGrad: { paddingVertical: 18, alignItems: 'center' },
        confirmText: { color: '#fff', fontSize: 16, fontWeight: '800' },
        confirmBtnDone: { opacity: 0.7 },

        cancelBtn: { alignItems: 'center', paddingVertical: 14 },
        cancelText: { color: T.sub, fontSize: 15 },
        scheduleHomeBtn: {
            borderRadius: 20,
            backgroundColor: T.elevated,
            borderWidth: 1,
            borderColor: T.border,
            paddingVertical: 18,
            alignItems: 'center',
            marginBottom: 12,
        },
        scheduleHomeText: { color: '#38BDF8', fontSize: 16, fontWeight: '700' },

        notifPill: {
            marginTop: 10,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 12,
            backgroundColor: 'rgba(0,229,255,0.07)',
            borderWidth: 1,
            borderColor: 'rgba(0,229,255,0.2)',
        },
        notifPillText: {
            color: '#00E5FF',
            fontSize: 12,
            fontWeight: '600',
            lineHeight: 18,
        },
    });
};
