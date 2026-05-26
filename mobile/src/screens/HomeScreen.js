import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, ScrollView, Animated, Platform, SafeAreaView, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { orchestrateRequest, getUserLocation, getReadableAddress } from '../api';
import { useBookings } from '../BookingContext';
import { getTheme, getGradients } from '../theme';
import * as Location from 'expo-location';
import { 
    Wind, Droplet, Zap, Sparkles, Hammer, Bug, MapPin, Users, Phone,
    Wrench, Mic, Bot, Car, Clock, History, User, Info, X
} from 'lucide-react-native';

const SUGGESTIONS = [
    { Icon: Wind,     iconColor: '#F5C518', label: 'AC Repair',    query: 'AC kharab hai theek karo' },
    { Icon: Droplet,  iconColor: '#F5C518', label: 'Plumber',      query: 'mujhy plumber chahiye' },
    { Icon: Zap,      iconColor: '#F5C518', label: 'Electrician',  query: 'bijli ka masla hai electrician chahiye' },
    { Icon: Sparkles, iconColor: '#F5C518', label: 'Cleaning',     query: 'ghar ki safai karni hai' },
    { Icon: Hammer,   iconColor: '#F5C518', label: 'Carpenter',    query: 'furniture theek karna hai' },
    { Icon: Bug,      iconColor: '#F5C518', label: 'Pest Control', query: 'keeray makoray ka spray chahiye' },
];

const C = {
    bg: '#0B0C0E', card: '#15181F', border: 'rgba(245, 197, 24, 0.08)',
    text: '#F8FAFC', sub: '#94A3B8', primary: '#F5C518', gold: '#F5C518',
};

function InputField({ label, icon, value, onChangeText, placeholder, keyboardType, multiline, maxLength }) {
    const { isDarkMode } = useBookings();
    const T = getTheme(isDarkMode);
    const styles = makeStyles(T);
    return (
        <View style={styles.fieldWrap}>
            <View style={styles.fieldLabelRow}>
                {icon}
                <Text style={[styles.fieldLabel, { color: T.sub }]}>{label}</Text>
            </View>
            <TextInput
                style={[
                    styles.fieldInput, 
                    multiline && { minHeight: 52 },
                    { backgroundColor: T.elevated, borderColor: T.border, color: T.textLight }
                ]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={T.placeholder}
                keyboardType={keyboardType ?? 'default'}
                multiline={multiline}
                maxLength={maxLength}
            />
        </View>
    );
}

function DropdownSelector({ label, icon, selectedValue, onValueChange, placeholder }) {
    const { isDarkMode } = useBookings();
    const T = getTheme(isDarkMode);
    const styles = makeStyles(T);
    const [isOpen, setIsOpen] = useState(false);
    const options = [
        { label: 'Sindh (Karachi)', value: 'Sindh' },
        { label: 'Punjab (Lahore, Multan, Rawalpindi)', value: 'Punjab' },
        { label: 'Islamabad Capital Territory', value: 'Islamabad' },
    ];

    return (
        <View style={styles.fieldWrap}>
            <View style={styles.fieldLabelRow}>
                {icon}
                <Text style={[styles.fieldLabel, { color: T.sub }]}>{label}</Text>
            </View>
            <TouchableOpacity 
                style={[styles.dropdownHeader, { backgroundColor: T.elevated, borderColor: T.border }]} 
                onPress={() => setIsOpen(!isOpen)}
                activeOpacity={0.8}
            >
                <Text style={[styles.dropdownHeaderText, { color: selectedValue ? T.textLight : T.placeholder }]}>
                    {selectedValue ? options.find(o => o.value === selectedValue)?.label : placeholder}
                </Text>
                <Text style={{ color: T.sub, fontSize: 10 }}>{isOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {isOpen && (
                <View style={[styles.dropdownOptionsContainer, { backgroundColor: T.card, borderColor: T.border }]}>
                    {options.map((opt) => (
                        <TouchableOpacity
                            key={opt.value}
                            style={[
                                styles.dropdownOption,
                                selectedValue === opt.value && { backgroundColor: 'rgba(245,197,24,0.08)' }
                            ]}
                            onPress={() => {
                                onValueChange(opt.value);
                                setIsOpen(false);
                             }}
                        >
                            <Text style={[
                                styles.dropdownOptionText, 
                                { color: T.sub },
                                selectedValue === opt.value && { color: T.accent1, fontWeight: '700' }
                            ]}>
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
}

const generateSlots = () => {
    const slots = [];
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 0; i < 3; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        
        const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : daysOfWeek[d.getDay()];
        const dateString = `${d.getDate()} ${months[d.getMonth()]}`;
        
        const allTimes = ['09:00 AM', '11:00 AM', '01:00 PM', '03:00 PM', '05:00 PM', '07:00 PM', '09:00 PM'];
        let times = [...allTimes];
        
        if (i === 0) {
            const now = new Date();
            times = allTimes.filter(t => {
                const [timeStr, modifier] = t.split(' ');
                let [hours, minutes] = timeStr.split(':').map(Number);
                if (modifier === 'PM' && hours < 12) hours += 12;
                if (modifier === 'AM' && hours === 12) hours = 0;
                
                const slotDate = new Date(now);
                slotDate.setHours(hours, minutes, 0, 0);
                return slotDate.getTime() > now.getTime();
            });
        }
        
        slots.push({
            dayLabel,
            dateString,
            dateKey: d.toDateString(),
            times,
        });
    }
    return slots;
};

const isImmediateUnavailable = () => {
    const hour = new Date().getHours();
    return hour >= 21 || hour < 9;
};

export default function HomeScreen({ navigation }) {
    const { user, isDarkMode } = useBookings();
    const T = getTheme(isDarkMode);
    const G = getGradients(isDarkMode);
    const styles = makeStyles(T);
    const isImmUnavailable = isImmediateUnavailable();
    const initialSlots = generateSlots();
    const defaultDaySlot = initialSlots.find(s => s.times.length > 0) || initialSlots[1] || initialSlots[0];
    const defaultTime = defaultDaySlot.times[0] || '09:00 AM';
    const defaultSlotStr = `${defaultDaySlot.dayLabel}, ${defaultDaySlot.dateString} at ${defaultTime}`;

    const [mode, setMode]                       = useState('self');   // 'self' | 'others'
    const [query, setQuery]                     = useState('');
    const [userPhone, setUserPhone]             = useState('');
    const [timeSlot, setTimeSlot]               = useState(isImmUnavailable ? defaultSlotStr : 'Immediate');
    const [timeOption, setTimeOption]           = useState(isImmUnavailable ? 'later' : 'immediate'); // 'immediate' | 'later'
    const [showSlotsModal, setShowSlotsModal]   = useState(false);
    
    const [selectedDayKey, setSelectedDayKey]   = useState(defaultDaySlot.dateKey);
    const [selectedDayLabel, setSelectedDayLabel] = useState(`${defaultDaySlot.dayLabel}, ${defaultDaySlot.dateString}`);
    const [selectedTime, setSelectedTime]       = useState(defaultTime);

    const [recipientName, setRecipientName]     = useState('');
    const [recipientPhone, setRecipientPhone]   = useState('');
    const [recipientAddress, setRecipientAddress] = useState('');
    const [recipientProvince, setRecipientProvince] = useState('');
    const [loading, setLoading]                 = useState(false);
    const [locationStatus, setLocationStatus]   = useState('idle');
    const [errorMsg, setErrorMsg]               = useState('');

    const [userLocationAddress, setUserLocationAddress] = useState('');
    const [userCoords, setUserCoords] = useState(null);
    const [locationLoading, setLocationLoading] = useState(false);

    const fadeAnim  = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    // Tab switching animations for iOS sliding feel
    const tabFadeAnim = useRef(new Animated.Value(1)).current;
    const tabSlideAnim = useRef(new Animated.Value(0)).current;
    const toggleAnim = useRef(new Animated.Value(0)).current;
    const [toggleWidth, setToggleWidth] = useState(0);

    const handleModeChange = (newMode) => {
        if (newMode === mode) return;
        setErrorMsg('');

        // 1. Slide the toggle background indicator
        Animated.timing(toggleAnim, {
            toValue: newMode === 'self' ? 0 : 1,
            duration: 250,
            useNativeDriver: true,
        }).start();

        // 2. Fade out & slide current content slightly up
        Animated.parallel([
            Animated.timing(tabFadeAnim, {
                toValue: 0,
                duration: 120,
                useNativeDriver: true,
            }),
            Animated.timing(tabSlideAnim, {
                toValue: -6,
                duration: 120,
                useNativeDriver: true,
            })
        ]).start(() => {
            // Swap active mode state
            setMode(newMode);
            // Position new content to slide up from bottom
            tabSlideAnim.setValue(6);

            // 3. Fade in & slide back to origin
            Animated.parallel([
                Animated.timing(tabFadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(tabSlideAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                })
            ]).start();
        });
    };

    const onToggleLayout = (e) => {
        const { width } = e.nativeEvent.layout;
        if (width > 0) {
            setToggleWidth((width - 14) / 2); // 10px outer padding (5x2), 4px gap
        }
    };

    const initiateLocationFetch = async () => {
        setLocationLoading(true);
        setErrorMsg('');
        try {
            const servicesEnabled = await Location.hasServicesEnabledAsync();
            if (!servicesEnabled) {
                setErrorMsg('Location services are disabled. Please turn on GPS / Location Services.');
                setLocationStatus('skipped');
                setLocationLoading(false);
                return;
            }

            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Location permission denied. Please enable permissions to find local services.');
                setLocationStatus('skipped');
                setLocationLoading(false);
                return;
            }

            const coords = await getUserLocation();
            if (coords) {
                setUserCoords(coords);
                setLocationStatus('ok');
                const addr = await getReadableAddress(coords.lat, coords.lng);
                setUserLocationAddress(addr);
            } else {
                setLocationStatus('skipped');
            }
        } catch (err) {
            console.warn('Location initialization error:', err);
            setLocationStatus('skipped');
        } finally {
            setLocationLoading(false);
        }
    };

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]).start();
        initiateLocationFetch();
    }, []);

    const handleSearch = async (overrideQuery) => {
        const q = (overrideQuery || query).trim();
        if (!q) {
            setErrorMsg("Please describe the service needed.");
            return;
        }

        const cleanUserPhone = user?.phone || '';
        const cleanRecipientPhone = recipientPhone.replace(/\D/g, '');

        if (mode === 'others') {
            if (!recipientName.trim()) {
                setErrorMsg("Please enter the recipient's name.");
                return;
            }
            if (!cleanRecipientPhone) {
                setErrorMsg("Please enter the recipient's phone number.");
                return;
            }
            if (cleanRecipientPhone.length !== 11) {
                setErrorMsg("Recipient phone number must be exactly 11 digits (e.g., 03001234567).");
                return;
            }
            if (!recipientProvince) {
                setErrorMsg("Please select the recipient's province.");
                return;
            }
            if (!recipientAddress.trim()) {
                setErrorMsg("Please enter the recipient's address.");
                return;
            }
        }

        setLoading(true);
        setErrorMsg('');

        const bookingMeta = {
            userPhone: cleanUserPhone,
            recipientName: mode === 'others' ? recipientName.trim() : '',
            recipientPhone: mode === 'others' ? cleanRecipientPhone : '',
            recipientAddress: mode === 'others' ? recipientAddress.trim() : '',
            recipientProvince: mode === 'others' ? recipientProvince : '',
            isForOthers: mode === 'others',
            timeSlot: timeSlot.trim() || 'Immediate',
        };

        let coords = userCoords;
        if (mode === 'self') {
            if (!coords) {
                setLocationStatus('fetching');
                coords = await getUserLocation();
                if (coords) {
                    setUserCoords(coords);
                    const addr = await getReadableAddress(coords.lat, coords.lng);
                    setUserLocationAddress(addr);
                }
                setLocationStatus(coords ? 'ok' : 'skipped');
            } else {
                setLocationStatus('ok');
            }
        }

        try {
            const data = await orchestrateRequest(q, coords, bookingMeta);
            navigation.navigate('Reasoning', { data, bookingMeta });
        } catch (e) {
            const msg = e?.response?.data?.detail || e?.message || 'Cannot reach the server. Is the backend running?';
            setErrorMsg(msg);
        } finally {
            setLoading(false);
            setLocationStatus('idle');
        }
    };

    const locationLabel =
        locationStatus === 'fetching' ? '📡 Getting your location…' :
        locationStatus === 'ok'       ? '📍 Location acquired' :
        locationStatus === 'skipped'  ? '📍 Using query location' : '';

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>



                    {/* Hero */}
                    <LinearGradient colors={G.brandHero} style={styles.hero}>
                        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center' }}>
                            <View style={styles.logoBadge}>
                                <LinearGradient
                                    colors={['rgba(245,197,24,0.18)', 'rgba(212,175,55,0.10)']}
                                    style={styles.logoBadgeGrad}
                                >
                                    <Wrench size={32} color={T.accent1} strokeWidth={1.8} />
                                </LinearGradient>
                                <View style={styles.logoBadgeGlow} />
                            </View>
                            <Text style={[styles.appName, { color: T.textLight }]}>اہلِ فن</Text>
                            <Text style={[styles.tagline, { color: T.sub }]}>AI-Powered Home Services · Pakistan</Text>
                        </Animated.View>
                    </LinearGradient>

                    <View style={styles.content}>

                        {/* Location Pill */}
                        <TouchableOpacity
                            style={[
                                styles.locationPill,
                                {
                                    backgroundColor: 'rgba(245, 197, 24, 0.08)',
                                    borderColor: 'rgba(245, 197, 24, 0.20)',
                                }
                            ]}
                            onPress={initiateLocationFetch}
                            activeOpacity={0.8}
                        >
                            {locationLoading ? (
                                <ActivityIndicator size={12} color={T.accent1} style={{ marginRight: 6 }} />
                            ) : (
                                <MapPin size={14} color={T.accent1} style={{ marginRight: 6 }} />
                            )}
                            <Text style={[styles.locationPillText, { color: T.accent1 }]} numberOfLines={1}>
                                {locationLoading ? 'Fetching location...' : (userLocationAddress || 'Unknown Location (Tap to retry)')}
                            </Text>
                        </TouchableOpacity>

                        {/* Mode Toggle */}
                        <View style={[styles.modeToggle, { backgroundColor: T.card, borderColor: T.border }]} onLayout={onToggleLayout}>
                            {toggleWidth > 0 && (
                                <Animated.View
                                    style={{
                                        position: 'absolute',
                                        top: 5,
                                        bottom: 5,
                                        left: 5,
                                        width: toggleWidth,
                                        borderRadius: 14,
                                        overflow: 'hidden',
                                        transform: [
                                            {
                                                translateX: toggleAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [0, toggleWidth + 4],
                                                })
                                            }
                                        ]
                                    }}
                                >
                                    <LinearGradient
                                        colors={G.brand}
                                        style={StyleSheet.absoluteFillObject}
                                        start={{x:0,y:0}}
                                        end={{x:1,y:0}}
                                    />
                                </Animated.View>
                            )}
                            <TouchableOpacity
                                style={styles.modeBtn}
                                onPress={() => handleModeChange('self')}
                                activeOpacity={0.9}
                            >
                                <View style={styles.modeBtnInner}>
                                    <MapPin size={14} color={mode === 'self' ? '#0B0C0E' : T.sub} />
                                    <Text style={[
                                        styles.modeBtnText,
                                        { color: mode === 'self' ? '#0B0C0E' : T.sub, fontWeight: mode === 'self' ? '700' : '600' }
                                    ]}>
                                        For Myself
                                    </Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modeBtn}
                                onPress={() => handleModeChange('others')}
                                activeOpacity={0.9}
                            >
                                <View style={styles.modeBtnInner}>
                                    <Users size={14} color={mode === 'others' ? '#0B0C0E' : T.sub} />
                                    <Text style={[
                                        styles.modeBtnText,
                                        { color: mode === 'others' ? '#0B0C0E' : T.sub, fontWeight: mode === 'others' ? '700' : '600' }
                                    ]}>
                                        Book for Others
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Search Card */}
                        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                            <View style={[styles.searchCard, { backgroundColor: T.card, borderColor: T.border }]}>
                                <Animated.View style={{ opacity: tabFadeAnim, transform: [{ translateY: tabSlideAnim }] }}>

                                {mode === 'self' ? (
                                    <>
                                        <Text style={[styles.cardHeading, { color: T.textLight }]}>What service do you need?</Text>

                                        <InputField
                                            label="Describe your need"
                                            icon={<Wrench size={15} color={T.sub} />}
                                            value={query}
                                            onChangeText={t => { setQuery(t); setErrorMsg(''); }}
                                            placeholder="e.g. AC kharab hai electrician chahiye…"
                                            multiline
                                        />
                                        <View style={styles.fieldLabelRow}>
                                            <Text style={[styles.fieldLabel, { color: T.sub }]}>⏰  Time of Service</Text>
                                        </View>
                                        <View style={styles.timeOptionsContainer}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.timeOptionBtn,
                                                    { backgroundColor: T.elevated, borderColor: T.border },
                                                    timeOption === 'immediate' && { borderColor: T.accent1, backgroundColor: 'rgba(245, 197, 24, 0.08)' },
                                                    isImmUnavailable && styles.timeOptionBtnDisabled
                                                ]}
                                                onPress={() => {
                                                    if (!isImmUnavailable) {
                                                        setTimeOption('immediate');
                                                        setTimeSlot('Immediate');
                                                    }
                                                }}
                                                disabled={isImmUnavailable}
                                            >
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <Zap size={14} color={timeOption === 'immediate' ? T.accent1 : T.sub} />
                                                    <Text style={[
                                                        styles.timeOptionText,
                                                        { color: T.sub },
                                                        timeOption === 'immediate' && { color: T.accent1, fontWeight: '700' },
                                                        isImmUnavailable && styles.timeOptionTextDisabled
                                                    ]}>
                                                        Immediate {isImmUnavailable ? '(Unavailable)' : ''}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[
                                                    styles.timeOptionBtn,
                                                    { backgroundColor: T.elevated, borderColor: T.border },
                                                    timeOption === 'later' && { borderColor: T.accent1, backgroundColor: 'rgba(245, 197, 24, 0.08)' }
                                                ]}
                                                onPress={() => {
                                                    setShowSlotsModal(true);
                                                }}
                                            >
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <Clock size={14} color={timeOption === 'later' ? T.accent1 : T.sub} />
                                                    <Text style={[
                                                        styles.timeOptionText,
                                                        { color: T.sub },
                                                        timeOption === 'later' && { color: T.accent1, fontWeight: '700' }
                                                    ]}>
                                                        Book for Later
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        </View>

                                        {timeOption === 'later' && (
                                            <View style={[styles.selectedSlotDisplay, { backgroundColor: 'rgba(245, 197, 24, 0.04)', borderColor: T.border }]}>
                                                <Text style={[styles.selectedSlotLabel, { color: T.sub }]}>Selected Slot:</Text>
                                                <Text style={[styles.selectedSlotValue, { color: T.textLight }]}>{timeSlot}</Text>
                                                <TouchableOpacity onPress={() => setShowSlotsModal(true)}>
                                                    <Text style={styles.changeSlotText}>Change</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                        {locationLabel ? (
                                             <View style={[styles.locBanner, { backgroundColor: 'rgba(245, 197, 24, 0.06)', borderColor: T.border }]}>
                                                 <Text style={[styles.locText, { color: T.accent1 }]}>{locationLabel}</Text>
                                             </View>
                                         ) : null}
                                    </>
                                ) : (
                                    <>
                                        <Text style={[styles.cardHeading, { color: T.textLight }]}>Book a service for someone else</Text>
                                        <View style={[styles.infoBanner, { backgroundColor: isDarkMode ? 'rgba(124,58,237,0.06)' : 'rgba(124,58,237,0.12)', borderColor: isDarkMode ? 'rgba(124,58,237,0.20)' : 'rgba(124,58,237,0.30)' }]}>
                                            <Info size={14} color="#A78BFA" style={{ marginRight: 8 }} />
                                            <Text style={[styles.infoText, { color: '#8B5CF6' }]}>
                                                The service provider will go to the address you specify below. We will geocode this location to find local providers nearby.
                                            </Text>
                                        </View>

                                        <InputField
                                            label="Recipient's Name"
                                            icon={<User size={15} color={T.sub} />}
                                            value={recipientName}
                                            onChangeText={setRecipientName}
                                            placeholder="e.g. Ahmad Ali"
                                        />
                                        <InputField
                                            label="Recipient's Contact Number"
                                            icon={<Phone size={15} color={T.sub} />}
                                            value={recipientPhone}
                                            onChangeText={setRecipientPhone}
                                            placeholder="e.g. 03129876543"
                                            keyboardType="phone-pad"
                                            maxLength={11}
                                        />
                                        <DropdownSelector
                                            label="Recipient's Province"
                                            icon={<MapPin size={15} color={T.sub} />}
                                            selectedValue={recipientProvince}
                                            onValueChange={setRecipientProvince}
                                            placeholder="Select Province (e.g. Sindh, Punjab)"
                                        />
                                        <InputField
                                            label="Recipient's Location / Address"
                                            icon={<MapPin size={15} color={T.sub} />}
                                            value={recipientAddress}
                                            onChangeText={t => { setRecipientAddress(t); setErrorMsg(''); }}
                                            placeholder="e.g. Malir Cantonment, Karachi"
                                        />
                                        <InputField
                                            label="Describe the service needed"
                                            icon={<Wrench size={15} color={T.sub} />}
                                            value={query}
                                            onChangeText={t => { setQuery(t); setErrorMsg(''); }}
                                            placeholder="e.g. Plumber chahiye kitchen sink block hai…"
                                            multiline
                                        />
                                        <View style={styles.fieldLabelRow}>
                                            <Text style={[styles.fieldLabel, { color: T.sub }]}>⏰  Time of Service</Text>
                                        </View>
                                        <View style={styles.timeOptionsContainer}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.timeOptionBtn,
                                                    { backgroundColor: T.elevated, borderColor: T.border },
                                                    timeOption === 'immediate' && { borderColor: T.accent1, backgroundColor: 'rgba(245, 197, 24, 0.08)' },
                                                    isImmUnavailable && styles.timeOptionBtnDisabled
                                                ]}
                                                onPress={() => {
                                                    if (!isImmUnavailable) {
                                                        setTimeOption('immediate');
                                                        setTimeSlot('Immediate');
                                                    }
                                                }}
                                                disabled={isImmUnavailable}
                                            >
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <Zap size={14} color={timeOption === 'immediate' ? T.accent1 : T.sub} />
                                                    <Text style={[
                                                        styles.timeOptionText,
                                                        { color: T.sub },
                                                        timeOption === 'immediate' && { color: T.accent1, fontWeight: '700' },
                                                        isImmUnavailable && styles.timeOptionTextDisabled
                                                    ]}>
                                                        Immediate {isImmUnavailable ? '(Unavailable)' : ''}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[
                                                    styles.timeOptionBtn,
                                                    { backgroundColor: T.elevated, borderColor: T.border },
                                                    timeOption === 'later' && { borderColor: T.accent1, backgroundColor: 'rgba(245, 197, 24, 0.08)' }
                                                ]}
                                                onPress={() => {
                                                    setShowSlotsModal(true);
                                                }}
                                            >
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <Clock size={14} color={timeOption === 'later' ? T.accent1 : T.sub} />
                                                    <Text style={[
                                                        styles.timeOptionText,
                                                        { color: T.sub },
                                                        timeOption === 'later' && { color: T.accent1, fontWeight: '700' }
                                                    ]}>
                                                        Book for Later
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        </View>

                                        {timeOption === 'later' && (
                                            <View style={[styles.selectedSlotDisplay, { backgroundColor: 'rgba(245, 197, 24, 0.04)', borderColor: T.border }]}>
                                                <Text style={[styles.selectedSlotLabel, { color: T.sub }]}>Selected Slot:</Text>
                                                <Text style={[styles.selectedSlotValue, { color: T.textLight }]}>{timeSlot}</Text>
                                                <TouchableOpacity onPress={() => setShowSlotsModal(true)}>
                                                    <Text style={styles.changeSlotText}>Change</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </>
                                )}

                                {errorMsg ? (
                                    <View style={styles.errBanner}>
                                        <Text style={styles.errText}>⚠️ {errorMsg}</Text>
                                    </View>
                                ) : null}

                                <TouchableOpacity onPress={() => handleSearch()} disabled={loading} style={styles.searchBtn}>
                                    <LinearGradient colors={G.brand} style={styles.searchBtnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
                                        {loading
                                            ? <ActivityIndicator color="#fff" />
                                            : <Text style={styles.searchBtnText}>
                                                {mode === 'others' ? 'Find Provider Near Them  →' : 'Find Service Provider  →'}
                                              </Text>
                                        }
                                    </LinearGradient>
                                </TouchableOpacity>
                                </Animated.View>
                            </View>
                        </Animated.View>

                        {/* Quick suggestions */}
                        <Text style={[styles.sectionTitle, { color: T.textLight }]}>Quick Services</Text>
                        <View style={styles.suggestionsGrid}>
                            {SUGGESTIONS.map((s) => (
                                <TouchableOpacity
                                    key={s.label}
                                    style={[styles.chip, { backgroundColor: T.card, borderColor: T.border }]}
                                    onPress={() => { setQuery(s.query); handleSearch(s.query); }}
                                    disabled={loading}
                                >
                                    <s.Icon size={20} color={s.iconColor} />
                                    <Text style={[styles.chipLabel, { color: T.textLight }]}>{s.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* How it works */}
                        <Text style={[styles.sectionTitle, { color: T.textLight }]}>How It Works</Text>
                        {[
                            { step:'1', Icon: Mic,  iconColor: '#F5C518', title:'Describe your need', desc:'Type in English, Urdu or Roman Urdu' },
                            { step:'2', Icon: Bot,  iconColor: '#F5C518', title:'AI finds providers', desc:'Ranked by distance & rating near the address' },
                            { step:'3', Icon: Car,  iconColor: '#F5C518', title:'Track live arrival',  desc:'Watch provider en route on the map' },
                        ].map(card => (
                            <View key={card.step} style={[styles.howCard, { backgroundColor: T.card, borderColor: T.border }]}>
                                <View style={[styles.howStep, { backgroundColor: 'rgba(245, 197, 24, 0.10)' }]}><Text style={styles.howStepText}>{card.step}</Text></View>
                                <View style={[styles.howIconWrap, { backgroundColor: T.elevated, borderColor: T.border }]}>
                                    <card.Icon size={24} color={card.iconColor} strokeWidth={1.8} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.howTitle, { color: T.textLight }]}>{card.title}</Text>
                                    <Text style={[styles.howDesc, { color: T.sub }]}>{card.desc}</Text>
                                </View>
                            </View>
                        ))}

                        <TouchableOpacity style={[styles.historyBtn, { backgroundColor: T.card, borderColor: T.border }]} onPress={() => navigation.navigate('History')}>
                            <History size={16} color={T.sub} />
                            <Text style={[styles.historyBtnText, { color: T.sub }]}>View My Bookings</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {showSlotsModal && (
                <View style={styles.modalBackdrop}>
                    <TouchableOpacity style={styles.backdropPress} activeOpacity={1} onPress={() => setShowSlotsModal(false)} />
                    <View style={[styles.modalContent, { backgroundColor: T.card, borderColor: T.border }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: T.textLight }]}>📅 Select Time Slot</Text>
                            <TouchableOpacity onPress={() => setShowSlotsModal(false)} style={[styles.closeBtn, { backgroundColor: T.elevated }]}>
                                <Text style={[styles.closeBtnText, { color: T.sub }]}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        
                        {/* Day / Date Selector */}
                        <Text style={[styles.modalSectionTitle, { color: T.textLight }]}>Choose Day</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayScroll}>
                            {generateSlots().map((s) => {
                                const isSelected = selectedDayKey === s.dateKey;
                                return (
                                    <TouchableOpacity
                                        key={s.dateKey}
                                        style={[styles.dayCard, { backgroundColor: T.elevated, borderColor: T.border }, isSelected && { borderColor: T.accent1, backgroundColor: 'rgba(245, 197, 24, 0.08)' }]}
                                        onPress={() => {
                                            setSelectedDayKey(s.dateKey);
                                            setSelectedDayLabel(`${s.dayLabel}, ${s.dateString}`);
                                        }}
                                    >
                                        <Text style={[styles.dayCardTitle, { color: isSelected ? T.accent1 : T.sub, fontWeight: '700' }]}>{s.dayLabel}</Text>
                                        <Text style={[styles.dayCardSub, { color: isSelected ? T.textLight : T.sub }]}>{s.dateString}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Time Grid */}
                        <Text style={[styles.modalSectionTitle, { color: T.textLight }]}>Available Hours</Text>
                        <View style={styles.timeGrid}>
                            {generateSlots().find(s => s.dateKey === selectedDayKey)?.times.map((t) => {
                                const isSelected = selectedTime === t;
                                return (
                                    <TouchableOpacity
                                        key={t}
                                        style={[styles.timeChip, { backgroundColor: T.elevated, borderColor: T.border }, isSelected && { borderColor: T.accent1, backgroundColor: 'rgba(245, 197, 24, 0.08)' }]}
                                        onPress={() => setSelectedTime(t)}
                                    >
                                        <Text style={[styles.timeChipText, { color: isSelected ? T.accent1 : T.sub, fontWeight: isSelected ? '700' : '500' }]}>{t}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Save Button */}
                        <TouchableOpacity
                            style={styles.modalConfirmBtn}
                            onPress={() => {
                                if (selectedDayLabel && selectedTime) {
                                    setTimeSlot(`${selectedDayLabel} at ${selectedTime}`);
                                    setTimeOption('later');
                                }
                                setShowSlotsModal(false);
                            }}
                        >
                            <LinearGradient colors={G.brand} style={styles.modalConfirmGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
                                <Text style={styles.modalConfirmText}>Confirm Time Slot</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const makeStyles = (T) => StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    scroll: { paddingBottom: 48 },

    hero: { paddingTop: Platform.OS === 'android' ? 50 : 60, paddingBottom: 32, alignItems: 'center' },
    logoBadge: { width: 80, height: 80, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 16, position: 'relative' },
    logoBadgeGrad: { width: 80, height: 80, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(56,189,248,0.25)', justifyContent: 'center', alignItems: 'center' },
    logoBadgeGlow: { position: 'absolute', width: 90, height: 90, borderRadius: 32, backgroundColor: 'rgba(56, 189, 248, 0.06)', zIndex: -1 },
    appName: { color: C.text, fontSize: 32, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
    tagline: { color: C.primary, fontSize: 13, fontWeight: '600', marginTop: 6 },

    content: { padding: 16 },

    // Mode toggle
    modeToggle: { flexDirection: 'row', backgroundColor: 'rgba(18,20,23,0.95)', borderRadius: 18, padding: 5, marginBottom: 16, borderWidth: 1, borderColor: C.border, gap: 4 },
    modeBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
    modeBtnActive: {},
    modeBtnGrad: { paddingVertical: 12, alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center' },
    modeBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 12 },
    modeBtnText: { color: C.sub, fontSize: 13, fontWeight: '600' },
    modeBtnTextActive: { color: '#fff', fontSize: 13, fontWeight: '700' },

    // Search card
    searchCard: { backgroundColor: C.card, borderRadius: 24, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: C.border },
    cardHeading: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 16 },

    fieldWrap: { marginBottom: 14 },
    fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    fieldLabel: { color: C.sub, fontSize: 12, fontWeight: '600' },
    fieldInput: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(56,189,248,0.15)', color: C.text, fontSize: 14 },
    dropdownHeader: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: 'rgba(56,189,248,0.15)',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dropdownHeaderText: {
        fontSize: 14,
    },
    dropdownOptionsContainer: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        marginTop: 6,
        overflow: 'hidden',
    },
    dropdownOption: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(255,255,255,0.04)',
    },
    dropdownOptionText: {
        fontSize: 13,
    },

    infoBanner: { backgroundColor: 'rgba(124,58,237,0.06)', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(124,58,237,0.20)', flexDirection: 'row', alignItems: 'flex-start' },
    infoText: { color: '#A78BFA', fontSize: 12, lineHeight: 18, flex: 1 },
    locBanner: { backgroundColor: 'rgba(56,189,248,0.06)', borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(56,189,248,0.20)' },
    locText: { color: C.primary, fontSize: 12 },
    errBanner: { backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
    errText: { color: '#EF4444', fontSize: 13 },

    searchBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 4 },
    searchBtnGrad: { paddingVertical: 16, alignItems: 'center' },
    searchBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

    sectionTitle: { color: C.text, fontSize: 17, fontWeight: '700', marginBottom: 14 },
    suggestionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
    chip: { backgroundColor: C.card, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.border, minWidth: '30%' },
    chipIcon: { fontSize: 20 },
    chipLabel: { color: C.text, fontSize: 13, fontWeight: '600' },

    howCard: { backgroundColor: C.card, borderRadius: 18, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: C.border },
    howStep: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(56,189,248,0.10)', justifyContent: 'center', alignItems: 'center' },
    howStepText: { color: C.primary, fontWeight: '800', fontSize: 14 },
    howIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
    howTitle: { color: C.text, fontSize: 15, fontWeight: '700' },
    howDesc: { color: C.sub, fontSize: 12, marginTop: 2 },

    historyBtn: { backgroundColor: C.card, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 16, borderWidth: 1, borderColor: C.border, flexDirection: 'row', justifyContent: 'center', gap: 10 },
    historyBtnText: { color: C.sub, fontSize: 15, fontWeight: '600' },

    // Time slots selection styles
    timeOptionsContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 14,
    },
    timeOptionBtn: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    timeOptionBtnActive: {
        borderColor: C.primary,
        backgroundColor: 'rgba(245, 197, 24, 0.06)',
    },
    timeOptionText: {
        color: C.sub,
        fontSize: 13,
        fontWeight: '600',
    },
    timeOptionTextActive: {
        color: C.primary,
    },
    timeOptionBtnDisabled: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderColor: 'rgba(255,255,255,0.03)',
        opacity: 0.45,
    },
    timeOptionTextDisabled: {
        color: 'rgba(255,255,255,0.25)',
    },
    selectedSlotDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 197, 24, 0.04)',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: 'rgba(245, 197, 24, 0.15)',
        gap: 8,
    },
    selectedSlotLabel: {
        color: C.sub,
        fontSize: 12,
    },
    selectedSlotValue: {
        color: C.text,
        fontSize: 12,
        fontWeight: '700',
        flex: 1,
    },
    locationPill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 16,
        alignSelf: 'center',
        maxWidth: '90%',
    },
    locationPillText: {
        fontSize: 12,
        fontWeight: '700',
    },
    changeSlotText: {
        color: C.primary,
        fontSize: 12,
        fontWeight: '700',
    },

    // Modal styles
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(5, 5, 12, 0.85)',
        justifyContent: 'flex-end',
        zIndex: 99999,
    },
    backdropPress: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
        backgroundColor: 'rgba(14, 16, 20, 0.98)',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        color: C.text,
        fontSize: 18,
        fontWeight: '800',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeBtnText: {
        color: C.sub,
        fontSize: 14,
    },
    modalSectionTitle: {
        color: C.text,
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 12,
    },
    dayScroll: {
        gap: 10,
        paddingBottom: 4,
        marginBottom: 20,
    },
    dayCard: {
        backgroundColor: '#0D0D20',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        minWidth: 85,
    },
    dayCardActive: {
        borderColor: C.primary,
        backgroundColor: 'rgba(245, 197, 24, 0.05)',
    },
    dayCardTitle: {
        color: C.sub,
        fontSize: 13,
        fontWeight: '700',
    },
    dayCardTitleActive: {
        color: C.primary,
    },
    dayCardSub: {
        color: C.sub,
        fontSize: 11,
        marginTop: 2,
    },
    dayCardSubActive: {
        color: C.text,
    },
    timeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 28,
    },
    timeChip: {
        backgroundColor: '#0D0D20',
        borderRadius: 12,
        paddingVertical: 12,
        width: '31%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    timeChipActive: {
        borderColor: C.primary,
        backgroundColor: 'rgba(245, 197, 24, 0.08)',
    },
    timeChipText: {
        color: C.sub,
        fontSize: 13,
        fontWeight: '600',
    },
    timeChipTextActive: {
        color: '#fff',
    },
    modalConfirmBtn: {
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 8,
    },
    modalConfirmGrad: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    modalConfirmText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '800',
    },
});
