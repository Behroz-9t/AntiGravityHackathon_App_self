import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, Animated,
    TouchableOpacity, ScrollView, Platform, useWindowDimensions,
    Modal, TextInput, PanResponder,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { useBookings } from '../BookingContext';
import RatingModal from '../components/RatingModal';
import { getTheme, getGradients, SHADOWS } from '../theme';
import { sendImmediateNotification } from '../notifications';
import { downloadBookingLogs } from '../utils/logExporter';

/* ─── Status flow ─────────────────────────────────────────────────────── */
const STATUSES = [
    { key: 'Pending',   label: 'Pending',             icon: '⏳', color: '#F59E0B', ms: 2500  },
    { key: 'Arriving',  label: 'Provider Arriving',    icon: '🚗', color: '#1A6BFF', ms: 30000 },
    { key: 'Working',   label: 'Service In Progress',  icon: '🔧', color: '#8B5CF6', ms: 8000  },
    { key: 'Completed', label: 'Done!',                icon: '✅', color: '#22C55E', ms: 0     },
];




export function parseTimeSlot(str) {
    if (!str) return null;
    const s = str.toLowerCase().trim();
    if (s.includes('immediate') || s.includes('as soon as') || s.includes('now')) {
        return new Date(); // Immediate
    }

    const now = new Date();
    let target = new Date(now);

    // Check if tomorrow
    if (s.includes('tomorrow')) {
        target.setDate(now.getDate() + 1);
    }

    // Default hours
    let hours = 12;
    let minutes = 0;

    if (s.includes('morning')) {
        hours = 9;
    } else if (s.includes('afternoon')) {
        hours = 14;
    } else if (s.includes('evening')) {
        hours = 17;
    } else if (s.includes('night') || s.includes('tonight')) {
        hours = 21;
    }

    // Match HH:MM or HH
    const timeMatch = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (timeMatch) {
        let parsedHours = parseInt(timeMatch[1], 10);
        const parsedMinutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const ampm = timeMatch[3];

        if (ampm === 'pm' && parsedHours < 12) {
            parsedHours += 12;
        } else if (ampm === 'am' && parsedHours === 12) {
            parsedHours = 0;
        }
        hours = parsedHours;
        minutes = parsedMinutes;
    }

    target.setHours(hours, minutes, 0, 0);

    if (target.getTime() < now.getTime() && !s.includes('tomorrow') && !s.includes('today')) {
        if (target.getHours() < now.getHours()) {
            target.setDate(now.getDate() + 1);
        }
    }

    return target;
}

export function formatCountdown(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/* ─── Main Screen ─────────────────────────────────────────────────────── */
export default function TrackingScreen({ route, navigation }) {
    const params = route.params ?? {};
    const { bookingId, bookingData, intentData, providerData, userLat, userLng } = params;
    const bookingMeta = params.bookingMeta || {};
    const { updateStatus, rateBooking, cancelBooking, isDarkMode } = useBookings();
    const { width } = useWindowDimensions();
    const T = getTheme(isDarkMode);
    const G = getGradients(isDarkMode);
    const styles = makeStyles(T, isDarkMode);

    const [statusIdx, setStatusIdx] = useState(0);
    const [showRating, setShowRating] = useState(false);
    const [phase, setPhase] = useState('tracking'); // 'tracking' | 'done'
    const [userRating, setUserRating] = useState(0);
    const [etaMins, setEtaMins] = useState(parseInt(providerData?.response_time_mins ?? 25, 10));
    
    // Cancellation states
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [customReason, setCustomReason] = useState('');

    const isScheduledInitial = bookingMeta.timeSlot && !/immediate|as soon as possible/i.test(bookingMeta.timeSlot);
    const [scheduledMode, setScheduledMode] = useState(!!isScheduledInitial);

    const getInitialCountdown = () => {
        if (!isScheduledInitial) return 0;
        const target = parseTimeSlot(bookingMeta.timeSlot);
        if (!target) return 0;
        const diffSecs = Math.max(0, Math.floor((target.getTime() - Date.now()) / 1000));
        return diffSecs;
    };

    const [countdown, setCountdown] = useState(getInitialCountdown());
    const [showNotification, setShowNotification] = useState(false);
    const notificationAnim = useRef(new Animated.Value(-120)).current;

    const progress = useRef(new Animated.Value(0)).current;
    const pulseScale = useRef(new Animated.Value(1)).current;
    const fadeIn = useRef(new Animated.Value(0)).current;
    const statusFade = useRef(new Animated.Value(1)).current;
    const doneAnim = useRef(new Animated.Value(0)).current;

    const { height: screenHeight } = useWindowDimensions();
    const minHeight = screenHeight * 0.40; // 40% height of details
    const maxHeight = screenHeight * 0.60; // 60% height of details

    const sheetHeight = useRef(new Animated.Value(minHeight)).current;
    const lastHeight = useRef(minHeight);

    useEffect(() => {
        const listenerId = sheetHeight.addListener(({ value }) => {
            lastHeight.current = value;
        });
        return () => sheetHeight.removeListener(listenerId);
    }, [sheetHeight]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (evt, gestureState) => {
                let newHeight = lastHeight.current - gestureState.dy;
                if (newHeight < minHeight) newHeight = minHeight;
                if (newHeight > maxHeight) newHeight = maxHeight;
                sheetHeight.setValue(newHeight);
            },
            onPanResponderRelease: (evt, gestureState) => {
                const midway = (minHeight + maxHeight) / 2;
                const targetHeight = lastHeight.current > midway ? maxHeight : minHeight;
                
                Animated.spring(sheetHeight, {
                    toValue: targetHeight,
                    useNativeDriver: false,
                    tension: 40,
                    friction: 8,
                }).start(() => {
                    lastHeight.current = targetHeight;
                });
            }
        })
    ).current;

    const mapBgColor = isDarkMode ? '#0A0B18' : '#F8FAFC';
    const tileLayerUrl = isDarkMode 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    const routeLineColor = isDarkMode ? '#00E5FF' : '#0284C7';
    const carBg = isDarkMode ? 'linear-gradient(145deg,#0d1421,#1a2340)' : 'linear-gradient(145deg,#ffffff,#f1f5f9)';
    const carBorderColor = isDarkMode ? '#00E5FF' : '#0284C7';
    const viRingBorderColor = isDarkMode ? 'rgba(0,229,255,0.5)' : 'rgba(2,132,199,0.5)';
    const headerGradColors = isDarkMode 
        ? ['rgba(10,10,20,0.95)', 'rgba(10,10,20,0)'] 
        : ['rgba(248,250,252,0.95)', 'rgba(248,250,252,0)'];

    const destinationText = bookingMeta?.recipientAddress || intentData?.location || 'Islamabad, Pakistan';
    const initialCountdownVal = useRef(getInitialCountdown()).current;
    const mapAnimationDelay = scheduledMode ? (initialCountdownVal * 1000 + 2500) : 2500;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        body { margin: 0; padding: 0; background-color: ${mapBgColor}; overflow: hidden; }
        #map { width: 100vw; height: 100vh; }
        .leaflet-container { background: ${mapBgColor}; }
        
        .vi-ring {
            position: absolute;
            width: 52px;
            height: 52px;
            border-radius: 50%;
            border: 2px solid ${viRingBorderColor};
            animation: viPulse 2s ease-in-out infinite;
        }
        @keyframes viPulse {
            0%   { transform: scale(0.9); opacity: 0.7; }
            50%  { transform: scale(1.6); opacity: 0;   }
            100% { transform: scale(0.9); opacity: 0.7; }
        }
        
        .user-icon { 
            font-size: 24px; 
            text-shadow: 0 0 15px #7C3AED;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { transform: scale(0.9); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
            100% { transform: scale(0.9); opacity: 1; }
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        async function initMap() {
            const locName = "${destinationText.replace(/"/g, '\\"')}";
            
            let lat = ${userLat ? userLat : 'null'};
            let lng = ${userLng ? userLng : 'null'};
            
            if (lat === null || lng === null) {
                lat = 24.8607;
                lng = 67.0011;
                try {
                    const geoRes = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(locName));
                    const geoData = await geoRes.json();
                    if(geoData && geoData.length > 0) {
                        lat = parseFloat(geoData[0].lat);
                        lng = parseFloat(geoData[0].lon);
                    }
                } catch(e) {}
            }
            
            // Randomize provider start point (about 3-4km away to generate a curvy route)
            const angle = Math.random() * Math.PI * 2;
            const dist = 0.03; // degrees (~3km)
            const startLat = lat + Math.sin(angle) * dist;
            const startLng = lng + Math.cos(angle) * dist;

            const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([lat, lng], 14);
            L.tileLayer('${tileLayerUrl}', { maxZoom: 19 }).addTo(map);

            let routeCoords = [[startLat, startLng], [lat, lng]];
            
            // Fetch real road data using OSRM
            try {
                const osrmRes = await fetch(\`https://router.project-osrm.org/route/v1/driving/\${startLng},\${startLat};\${lng},\${lat}?overview=full&geometries=geojson\`);
                const osrmData = await osrmRes.json();
                if(osrmData.routes && osrmData.routes.length > 0) {
                    // OSRM returns [lon, lat]
                    routeCoords = osrmData.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                }
            } catch(e) {}

            // Draw route line
            const routeLine = L.polyline(routeCoords, { color: '${routeLineColor}', weight: 4, dashArray: '8, 8' }).addTo(map);
            L.polyline(routeCoords, { color: '${routeLineColor}', weight: 12, opacity: 0.15 }).addTo(map);
            
            // Auto fit bounds
            map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });

            // User pin
            const userIcon = L.divIcon({ html: '<div class="user-icon">📍</div>', className: '', iconSize: [24, 24], iconAnchor: [12, 24] });
            L.marker([lat, lng], { icon: userIcon }).addTo(map);

            // Professional pulsing car pin (CSS-only, no SVG conflicts)
            const carHtml = '<div style="position:relative;width:52px;height:52px;display:flex;align-items:center;justify-content:center"><div class="vi-ring"></div><div style="width:38px;height:38px;border-radius:50%;background:${carBg};border:2.5px solid ${carBorderColor};box-shadow:0 0 20px rgba(0,229,255,0.7),0 0 40px rgba(0,229,255,0.2);display:flex;align-items:center;justify-content:center;font-size:20px">&#x1F6FB;</div></div>';
            const vehicleIcon = L.divIcon({ html: carHtml, className: '', iconSize: [52, 52], iconAnchor: [26, 26] });
            const vehicle = L.marker(routeCoords[0], { icon: vehicleIcon }).addTo(map);

            // Animate vehicle — slow realistic speed
            setTimeout(() => {
                let startTimestamp = null;
                const duration = 30000; // 30s for realistic travel feel
                
                function animate(timestamp) {
                    if (!startTimestamp) startTimestamp = timestamp;
                    let progress = (timestamp - startTimestamp) / duration;
                    if (progress > 1) progress = 1;

                    const segments = routeCoords.length - 1;
                    const floatIndex = progress * segments;
                    const index = Math.min(Math.floor(floatIndex), segments - 1);
                    const segmentProgress = floatIndex - index;

                    const curLat = routeCoords[index][0] + (routeCoords[index+1][0] - routeCoords[index][0]) * segmentProgress;
                    const curLng = routeCoords[index][1] + (routeCoords[index+1][1] - routeCoords[index][1]) * segmentProgress;
                    
                    vehicle.setLatLng([curLat, curLng]);
                    
                    // Pan map along with car, keeping user and car in view
                    map.setView([curLat, curLng], map.getZoom(), {animate: false});

                    if (progress < 1) requestAnimationFrame(animate);
                }
                requestAnimationFrame(animate);
            }, ${mapAnimationDelay}); // Delay to match phase transitions
        }
        initMap();
    </script>
</body>
</html>
    `;

    const triggerBookingStart = () => {
        setScheduledMode(false);
        updateStatus(bookingId, 'Pending');

        // In-app toast overlay
        setShowNotification(true);
        Animated.sequence([
            Animated.spring(notificationAnim, { toValue: Platform.OS === 'android' ? 56 : 24, useNativeDriver: true }),
            Animated.delay(4500),
            Animated.timing(notificationAnim, { toValue: -140, duration: 300, useNativeDriver: true })
        ]).start(() => setShowNotification(false));

        // Cross-platform push notification (expo-notifications on native, Web API on browser)
        sendImmediateNotification(
            '🚀 Booking Started — ???? ??',
            `${providerData?.provider_name ?? 'Your provider'} is on the way for ${bookingMeta.timeSlot ?? 'your scheduled slot'}!`
        );
    };

    const startProgression = () => {
        let cum = 0;
        const timers = STATUSES.slice(0, -1).map((s, i) => {
            cum += s.ms;
            return setTimeout(() => {
                Animated.timing(statusFade, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
                    setStatusIdx(i + 1);
                    updateStatus(bookingId, STATUSES[i + 1].key);
                    Animated.timing(statusFade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
                });
                if (i + 1 === 1) {
                    // Start vehicle animation along route
                    Animated.timing(progress, {
                        toValue: 1, duration: STATUSES[1].ms - 600,
                        useNativeDriver: false,
                    }).start();
                }
                if (i + 1 === STATUSES.length - 1) {
                    setTimeout(() => setShowRating(true), 1200);
                }
            }, cum);
        });
        return timers;
    };

    useEffect(() => {
        Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        // Pulsing destination marker
        Animated.loop(Animated.sequence([
            Animated.timing(pulseScale, { toValue: 1.7, duration: 900, useNativeDriver: true }),
            Animated.timing(pulseScale, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])).start();

        let timers = [];
        let etaTimer = null;

        if (scheduledMode) {
            const countdownInterval = setInterval(() => {
                setCountdown(c => {
                    if (c <= 1) {
                        clearInterval(countdownInterval);
                        triggerBookingStart();
                        return 0;
                    }
                    return c - 1;
                });
            }, 1000);
            return () => clearInterval(countdownInterval);
        } else {
            timers = startProgression();
            etaTimer = setInterval(() => setEtaMins(p => p > 1 ? p - 1 : 0), 60000);
        }

        return () => {
            timers.forEach(clearTimeout);
            if (etaTimer) clearInterval(etaTimer);
        };
    }, [scheduledMode]);

    const handleRating = (stars) => {
        setUserRating(stars);
        rateBooking(bookingId, stars);
        setShowRating(false);
        setPhase('done');
        Animated.spring(doneAnim, { toValue: 1, useNativeDriver: true }).start();
    };

    const handleConfirmCancel = async () => {
        const finalReason = cancelReason === 'Other' ? customReason.trim() : cancelReason;
        if (!finalReason) {
            alert('Please select or specify a reason.');
            return;
        }
        await cancelBooking(bookingId, finalReason);
        setShowCancelModal(false);
        sendImmediateNotification('❌ Booking Cancelled', `Your booking for ${intentData?.service ?? 'service'} has been cancelled.`);
        goHome();
    };

    const CANCEL_REASONS = [
        "Changed my mind",
        "Provider is late",
        "Found another service",
        "Price is too high",
        "Other"
    ];

    const goHome = () => navigation.reset({ index: 0, routes: [{ name: 'Home' }] });

    const currentStatus = STATUSES[statusIdx];

    const handleDownloadLogs = async () => {
        const logsData = {
            bookingId,
            service: intentData?.service ?? 'Service',
            provider: providerData?.provider_name ?? 'Provider',
            status: currentStatus.key,
            date: bookingMeta?.timeSlot || new Date().toLocaleString('en-PK'),
            rating: userRating,
            startTime: new Date(bookingData?.start_time || Date.now()).toISOString(),
            endTime: new Date(Date.now()).toISOString(),
            meta: {
                provider: providerData,
                booking: bookingMeta,
                location: bookingMeta?.recipientAddress || intentData?.location,
            },
        };
        const result = await downloadBookingLogs(logsData);
        if (result.success) {
            sendImmediateNotification('📥 Logs Downloaded', 'Your booking logs have been saved successfully!');
        }
    };

    // ── DONE screen ──────────────────────────────────────────────────────
    if (phase === 'done') {
        return (
            <SafeAreaView style={styles.safe}>
                <Animated.View style={[styles.doneContainer, { opacity: doneAnim, transform: [{ scale: doneAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>
                    <View style={styles.doneCircle}><Text style={{ fontSize: 56 }}>🎉</Text></View>
                    <Text style={styles.doneTitle}>Service Complete!</Text>
                    <Text style={styles.doneSub}>
                        {providerData?.provider_name} has finished the job.
                    </Text>
                    <View style={styles.starDisplay}>
                        {[1, 2, 3, 4, 5].map(i => (
                            <Text key={i} style={[styles.doneStar, { opacity: i <= userRating ? 1 : 0.2 }]}>★</Text>
                        ))}
                    </View>
                    <Text style={styles.ratingThanks}>Thank you for your rating!</Text>
                    <TouchableOpacity style={styles.homeBtn} onPress={goHome}>
                        <LinearGradient colors={G.brand} style={styles.homeBtnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
                            <Text style={styles.homeBtnText}>Return Home</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </SafeAreaView>
        );
    }

    // ── TRACKING screen ──────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.safe}>
            <Animated.View style={{ flex: 1, opacity: fadeIn }}>
                
                {/* ── FULL SCREEN INTERACTIVE MAP ──────────────────── */}
                <View style={styles.mapWrapper}>
                    {Platform.OS === 'web' ? (
                        <iframe srcDoc={htmlContent} style={{ width: '100%', height: '100%', border: 'none' }} />
                    ) : (
                        <WebView
                            source={{ html: htmlContent }}
                            style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
                            domStorageEnabled={true}
                            javaScriptEnabled={true}
                        />
                    )}
                </View>

                {/* ── HEADER OVERLAY ────────────────────────────────── */}
                <LinearGradient colors={headerGradColors} style={styles.header}>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>Live Tracking</Text>
                        <Animated.Text style={[styles.headerStatus, { color: scheduledMode ? '#D4AF37' : currentStatus.color, opacity: statusFade }]}>
                            {scheduledMode ? `⏰ Scheduled (${formatCountdown(countdown)})` : `${currentStatus.icon}  ${currentStatus.label}`}
                        </Animated.Text>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.logsBtn} onPress={handleDownloadLogs}>
                            <Text style={styles.logsBtnText}>📥</Text>
                        </TouchableOpacity>
                        <View style={styles.etaBadge}>
                            <Text style={styles.etaNum}>{etaMins}</Text>
                            <Text style={styles.etaLabel}>min</Text>
                        </View>
                    </View>
                </LinearGradient>

                {scheduledMode && (
                    <View style={styles.scheduledBanner}>
                        <Text style={styles.scheduledTitle}>📅 Booking Scheduled</Text>
                        <Text style={styles.scheduledText}>
                            Allocated slot: <Text style={{fontWeight:'700', color: isDarkMode ? '#00E5FF' : '#0284C7'}}>{bookingMeta.timeSlot}</Text>
                        </Text>
                        <Text style={styles.scheduledCountdown}>
                            Starting automatically in <Text style={{color:'#D4AF37', fontWeight:'800'}}>{formatCountdown(countdown)}</Text>
                        </Text>
                    </View>
                )}


                {showNotification && (
                    <Animated.View style={[styles.notificationToast, { transform: [{ translateY: notificationAnim }] }]}>
                        <View style={styles.notificationHeader}>
                            <Text style={styles.notificationIcon}>🔔</Text>
                            <Text style={styles.notificationTitle}>Booking Started</Text>
                        </View>
                        <Text style={styles.notificationText}>
                            Your scheduled booking is starting now! {providerData?.provider_name} is arriving.
                        </Text>
                    </Animated.View>
                )}

                {/* ── BOTTOM SHEET DETAILS OVERLAY ─────────────────── */}
                <Animated.View style={[styles.bottomOverlay, { height: sheetHeight }]}>
                    <View style={styles.dragHandleContainer} {...panResponder.panHandlers}>
                        <View style={[styles.dragHandle, { backgroundColor: T.border }]} />
                    </View>
                    <ScrollView 
                        showsVerticalScrollIndicator={false} 
                        contentContainerStyle={styles.bottomSheetScroll}
                        bounces={false}
                    >
                        {/* Horizontal Mini Timeline */}
                        <View style={styles.miniTimeline}>
                            {STATUSES.map((s, i) => {
                                const done = i < statusIdx;
                                const active = i === statusIdx;
                                return (
                                    <View key={s.key} style={styles.miniStep}>
                                        <View style={[
                                            styles.miniStepCircle, 
                                            done && { backgroundColor: '#22C55E' }, 
                                            active && { backgroundColor: '#1A6BFF', borderColor: 'rgba(26,107,255,0.4)', borderWidth: 3 }
                                        ]}>
                                            {done ? <Text style={styles.miniStepCheck}>✓</Text> : <Text style={styles.miniStepIcon}>{s.icon}</Text>}
                                        </View>
                                        <Text style={[styles.miniStepLabel, active && { color: '#1A6BFF', fontWeight: '700' }]}>{s.label}</Text>
                                    </View>
                                );
                            })}
                        </View>

                        {/* Provider Card */}
                        <View style={styles.providerCard}>
                            <View style={[styles.providerAvatar, { backgroundColor: '#1A6BFF' }]}>
                                <Text style={styles.providerAvatarText}>{(providerData?.provider_name ?? 'P')[0]}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.providerName}>{providerData?.provider_name ?? 'Provider'}</Text>
                                <Text style={styles.providerService}>{intentData?.service ?? 'Service'}</Text>
                                <View style={styles.providerMeta}>
                                    <Text style={styles.metaItem}>⭐ {providerData?.rating ?? '4.5'}</Text>
                                    <Text style={styles.metaItem}>📍 {providerData?.location ?? ''}</Text>
                                    <Text style={styles.metaItem}>⏱ {providerData?.response_time_mins ?? '?'} min</Text>
                                </View>
                                <View style={{ height: 1, backgroundColor: T.border, marginVertical: 8 }} />
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ color: '#00E5FF', fontSize: 13, fontWeight: '600' }}>
                                        📞 {providerData?.phone_number ?? '0312-3456789'}
                                    </Text>
                                    <Text style={{ color: T.sub, fontSize: 11, fontWeight: '500' }}>
                                        💼 Jobs Done: <Text style={{ color: T.textLight, fontWeight: '700' }}>{providerData?.total_services ?? '47'}</Text>
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Contact Details Overlay Card */}
                        {(bookingMeta?.recipientName || bookingMeta?.recipientPhone || bookingMeta?.userPhone) ? (
                            <View style={styles.contactCard}>
                                {bookingMeta?.recipientAddress ? (
                                    <>
                                        <Text style={styles.contactTitle}>👥 Booking For Other</Text>
                                        <Text style={styles.contactDetail}>Name: <Text style={styles.contactVal}>{bookingMeta.recipientName || 'N/A'}</Text></Text>
                                        <Text style={styles.contactDetail}>Phone: <Text style={styles.contactVal}>{bookingMeta.recipientPhone || 'N/A'}</Text></Text>
                                        <Text style={styles.contactDetail}>Address: <Text style={styles.contactVal}>{bookingMeta.recipientAddress}</Text></Text>
                                        {bookingMeta?.userPhone ? (
                                            <Text style={[styles.contactDetail, { marginTop: 4 }]}>Sender Phone: <Text style={styles.contactVal}>{bookingMeta.userPhone}</Text></Text>
                                        ) : null}
                                    </>
                                ) : (
                                    bookingMeta?.userPhone ? (
                                        <>
                                            <Text style={styles.contactTitle}>📞 Contact Information</Text>
                                            <Text style={styles.contactDetail}>Phone: <Text style={styles.contactVal}>{bookingMeta.userPhone}</Text></Text>
                                        </>
                                    ) : null
                                )}
                                



                                {scheduledMode ? (
                                    <View style={[styles.smsConfirmationPill, { marginTop: 6, backgroundColor: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.2)' }]}>
                                        <Text style={[styles.smsConfirmationText, { color: '#8B5CF6' }]}>
                                            🔔 Reminder scheduled on this mobile
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                        ) : null}
                        
                        {currentStatus.key !== 'Completed' && (
                            <TouchableOpacity
                                style={[styles.cancelBookingBtn, { marginTop: 12 }]}
                                onPress={() => setShowCancelModal(true)}
                            >
                                <Text style={styles.cancelBookingBtnText}>❌ Cancel Booking</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={styles.backHomeBtn}
                            onPress={goHome}
                        >
                            <Text style={styles.backHomeBtnText}>🏠 Return to Home Screen</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>

            </Animated.View>

            <RatingModal
                visible={showRating}
                providerName={providerData?.provider_name ?? 'the provider'}
                bookingId={bookingId}
                onSubmit={handleRating}
            />

            {/* Cancellation Modal */}
            <Modal
                visible={showCancelModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowCancelModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: T.card, borderColor: T.border }]}>
                        <Text style={[styles.modalTitle, { color: T.textLight }]}>Cancel Booking</Text>
                        <Text style={[styles.modalSubtitle, { color: T.sub }]}>Please tell us why you want to cancel:</Text>
                        
                        <ScrollView style={{ maxHeight: 220, width: '100%' }} showsVerticalScrollIndicator={false}>
                            {CANCEL_REASONS.map((r) => {
                                const selected = cancelReason === r;
                                return (
                                    <TouchableOpacity
                                        key={r}
                                        style={[
                                            styles.reasonOption,
                                            { borderColor: selected ? '#38BDF8' : T.border, backgroundColor: selected ? 'rgba(56, 189, 248, 0.08)' : 'transparent' }
                                        ]}
                                        onPress={() => {
                                            setCancelReason(r);
                                            if (r !== 'Other') setCustomReason('');
                                        }}
                                    >
                                        <Text style={[styles.reasonText, { color: selected ? '#38BDF8' : T.textLight }]}>{r}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {cancelReason === 'Other' && (
                            <TextInput
                                style={[styles.customReasonInput, { color: T.textLight, borderColor: T.border, backgroundColor: T.elevated }]}
                                placeholder="Please specify your reason..."
                                placeholderTextColor={T.placeholder}
                                value={customReason}
                                onChangeText={setCustomReason}
                                maxLength={100}
                            />
                        )}

                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnSecondary, { borderColor: T.border }]}
                                onPress={() => setShowCancelModal(false)}
                            >
                                <Text style={[styles.modalBtnTextSecondary, { color: T.sub }]}>Dismiss</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: '#EF4444' }]}
                                onPress={handleConfirmCancel}
                            >
                                <Text style={[styles.modalBtnTextPrimary, { color: '#fff' }]}>Confirm Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const makeStyles = (T, isDarkMode) => StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#0A0B18' },

    // Map Background
    mapWrapper: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#0A0B18',
    },

    // Header Overlay
    header: { 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: T.sp5, 
        paddingVertical: T.sp4, 
        paddingTop: Platform.OS === 'android' ? 48 : T.sp5 
    },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { ...T.fH3, color: T.textLight, fontWeight: '700' },
    headerStatus: { ...T.fCaption, fontWeight: '600', marginTop: 2 },
    etaBadge: { 
        backgroundColor: isDarkMode ? 'rgba(26,107,255,0.18)' : 'rgba(2, 132, 199, 0.1)', 
        borderRadius: T.r2, 
        paddingHorizontal: T.sp3, 
        paddingVertical: T.sp2, 
        alignItems: 'center', 
        borderWidth: 1, 
        borderColor: isDarkMode ? 'rgba(26,107,255,0.4)' : 'rgba(2, 132, 199, 0.3)', 
        minWidth: 52 
    },
    etaNum: { color: isDarkMode ? '#00E5FF' : '#0284C7', fontSize: 20, fontWeight: '800' },
    etaLabel: { color: isDarkMode ? '#00E5FF' : '#0284C7', fontSize: 10, fontWeight: '600' },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: T.sp2,
    },
    logsBtn: {
        backgroundColor: isDarkMode ? 'rgba(0, 229, 255, 0.08)' : 'rgba(2, 132, 199, 0.08)',
        borderRadius: T.r2,
        paddingHorizontal: 12,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: isDarkMode ? 'rgba(0, 229, 255, 0.35)' : 'rgba(2, 132, 199, 0.35)',
    },
    logsBtnText: {
        color: isDarkMode ? '#00E5FF' : '#0284C7',
        fontSize: 16,
        fontWeight: 'bold',
    },

    // Bottom Sheet Overlay
    bottomOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: T.card,
        borderTopLeftRadius: T.r6,
        borderTopRightRadius: T.r6,
        paddingHorizontal: T.sp5,
        paddingBottom: T.sp5,
        borderWidth: 1,
        borderColor: T.border,
        zIndex: 10,
        ...SHADOWS.card,
    },
    dragHandleContainer: {
        width: '100%',
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dragHandle: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
    },
    bottomSheetScroll: {
        paddingBottom: 36,
    },

    // Mini Horizontal stepper
    miniTimeline: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: T.sp5, paddingHorizontal: T.sp2 },
    miniStep: { alignItems: 'center', flex: 1 },
    miniStepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: T.elevated, justifyContent: 'center', alignItems: 'center', marginBottom: 6, borderWidth: 1, borderColor: T.border },
    miniStepCheck: { color: '#fff', fontSize: 12, fontWeight: '900' },
    miniStepIcon: { fontSize: 13 },
    miniStepLabel: { fontSize: 9, color: T.sub, textAlign: 'center', fontWeight: '500' },

    // Provider card
    providerCard: { 
        backgroundColor: T.elevated, 
        borderRadius: T.r4, 
        padding: T.sp4, 
        borderWidth: 1, 
        borderColor: T.border, 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: T.sp4, 
        overflow: 'hidden' 
    },
    providerAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    providerAvatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
    providerName: { ...T.fH3, color: T.textLight },
    providerService: { color: '#1A6BFF', ...T.fCaption, fontWeight: '600', marginBottom: 2 },
    providerMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: T.sp2 },
    metaItem: { color: T.sub, ...T.fCaption },

    contactCard: {
        backgroundColor: 'rgba(56, 189, 248, 0.05)',
        borderRadius: T.r3,
        padding: T.sp3,
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.2)',
        marginTop: T.sp3,
    },
    contactTitle: {
        color: '#38BDF8',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 6,
    },
    contactDetail: {
        color: T.sub,
        fontSize: 11,
        lineHeight: 16,
    },
    contactVal: {
        color: T.textLight,
        fontWeight: '600',
    },


    // Done screen
    doneContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: T.sp8, backgroundColor: T.bg },
    doneCircle: { width: 128, height: 128, borderRadius: 64, backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 2, borderColor: 'rgba(34,197,94,0.35)', justifyContent: 'center', alignItems: 'center', marginBottom: T.sp6 },
    doneTitle: { ...T.fDisplay, color: T.textLight, marginBottom: T.sp2 },
    doneSub: { ...T.fBody, color: T.sub, textAlign: 'center', marginBottom: T.sp5 },
    starDisplay: { flexDirection: 'row', gap: T.sp2, marginBottom: T.sp2 },
    doneStar: { fontSize: 36, color: '#F5A623' },
    ratingThanks: { ...T.fBody, color: '#22C55E', fontWeight: '700', marginBottom: T.sp8 },
    homeBtn: { width: '100%', borderRadius: T.r5, overflow: 'hidden', ...SHADOWS.btn },
    homeBtnGrad: { paddingVertical: T.sp5, alignItems: 'center', borderRadius: T.r5 },
    homeBtnText: { ...T.fH3, color: '#fff', fontWeight: '700' },

    scheduledBanner: {
        position: 'absolute',
        top: Platform.OS === 'android' ? 120 : 100,
        left: 20,
        right: 20,
        backgroundColor: isDarkMode ? 'rgba(30, 30, 56, 0.95)' : 'rgba(255, 255, 255, 0.98)',
        borderRadius: T.r3,
        padding: T.sp4,
        borderWidth: 1,
        borderColor: isDarkMode ? '#8B5CF6' : '#7C3AED',
        zIndex: 999,
        alignItems: 'center',
        ...SHADOWS.card,
    },
    scheduledTitle: { color: isDarkMode ? '#8B5CF6' : '#7C3AED', fontWeight: '800', fontSize: 16, marginBottom: 4 },
    scheduledText: { color: T.textLight, fontSize: 13, marginBottom: 8, textAlign: 'center' },
    scheduledCountdown: { color: T.sub, fontSize: 12, marginBottom: 12, textAlign: 'center' },
    startNowBtn: {
        backgroundColor: '#8B5CF6',
        borderRadius: T.r2,
        paddingHorizontal: T.sp4,
        paddingVertical: T.sp2,
        ...SHADOWS.btn,
    },
    startNowText: { color: '#fff', fontSize: 12, fontWeight: '700' },

    notificationToast: {
        position: 'absolute',
        left: 16,
        right: 16,
        backgroundColor: '#1E1E38',
        borderRadius: T.r3,
        padding: T.sp4,
        borderWidth: 1,
        borderColor: '#00E5FF',
        zIndex: 9999,
        ...SHADOWS.card,
    },
    notificationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    notificationIcon: { fontSize: 18 },
    notificationTitle: { color: '#00E5FF', fontWeight: '800', fontSize: 14 },
    notificationText: { color: T.textLight, fontSize: 12, lineHeight: 16 },

    backHomeBtn: {
        marginTop: 12,
        borderRadius: T.r3,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        paddingVertical: 14,
        alignItems: 'center',
    },
    backHomeBtnText: { color: '#00E5FF', fontSize: 14, fontWeight: '700' },
    smsConfirmationPill: {
        backgroundColor: 'rgba(0,229,255,0.08)',
        borderRadius: 10,
        padding: 10,
        marginTop: 10,
        borderWidth: 1,
        borderColor: 'rgba(0,229,255,0.2)',
        alignItems: 'center',
    },
    smsConfirmationText: {
        color: '#00E5FF',
        fontSize: 12,
        fontWeight: '600',
    },
    
    // Cancellation styles
    cancelBookingBtn: {
        borderRadius: T.r3,
        backgroundColor: 'rgba(239,68,68,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.2)',
        paddingVertical: 14,
        alignItems: 'center',
    },
    cancelBookingBtnText: {
        color: '#EF4444',
        fontSize: 14,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '85%',
        borderRadius: 24,
        borderWidth: 1,
        padding: 24,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 13,
        marginBottom: 16,
        textAlign: 'center',
    },
    reasonOption: {
        width: '100%',
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    reasonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    customReasonInput: {
        width: '100%',
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        fontSize: 13,
        marginTop: 8,
        minHeight: 40,
    },
    modalBtnRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
        width: '100%',
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBtnSecondary: {
        borderWidth: 1,
        backgroundColor: 'transparent',
    },
    modalBtnPrimary: {},
    modalBtnTextSecondary: {
        fontSize: 13,
        fontWeight: '700',
    },
    modalBtnTextPrimary: {
        fontSize: 13,
        fontWeight: '700',
    },
});

