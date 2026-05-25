import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput,
    TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useBookings } from '../BookingContext';
import { T, GRADIENTS, SHADOWS } from '../theme';
import { User, Mail, Phone, Lock, LogIn, UserPlus, Wrench } from 'lucide-react-native';

export default function AuthScreen() {
    const { login, register } = useBookings();
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const validateEmail = (val) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(val);
    };

    const handleSubmit = async () => {
        setErrorMsg('');
        const cleanPhone = phone.replace(/\D/g, '');

        if (isLogin) {
            if (!cleanPhone || !password) {
                setErrorMsg('Please fill in all fields.');
                return;
            }
            if (cleanPhone.length !== 11) {
                setErrorMsg('Phone number must be exactly 11 digits (e.g. 03001234567).');
                return;
            }
            const res = await login(cleanPhone, password);
            if (!res.success) {
                setErrorMsg(res.error);
            }
        } else {
            if (!name.trim() || !email.trim() || !cleanPhone || !password) {
                setErrorMsg('Please fill in all fields.');
                return;
            }
            if (!validateEmail(email.trim())) {
                setErrorMsg('Please enter a valid email address.');
                return;
            }
            if (cleanPhone.length !== 11) {
                setErrorMsg('Phone number must be exactly 11 digits (e.g. 03001234567).');
                return;
            }
            const res = await register(name, email.trim(), cleanPhone, password);
            if (!res.success) {
                setErrorMsg(res.error);
            }
        }
    };

    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.safe, { paddingTop: insets.top }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    {/* Logo / Branding Area */}
                    <View style={styles.logoContainer}>
                        <View style={styles.logoIconWrap}>
                            <LinearGradient
                                colors={['rgba(56,189,248,0.15)', 'rgba(212,175,55,0.08)']}
                                style={styles.logoGrad}
                            >
                                <Wrench size={34} color="#38BDF8" strokeWidth={1.8} />
                            </LinearGradient>
                            <View style={styles.logoGlow} />
                        </View>
                        <Text style={styles.logoTitle}>اہلِ فن</Text>
                        <Text style={styles.logoSubtitle}>Agentic Local Service Marketplace</Text>
                    </View>

                    {/* Auth Card */}
                    <View style={styles.card}>
                        {/* Tab Switcher */}
                        <View style={styles.tabContainer}>
                            <TouchableOpacity
                                style={[styles.tab, isLogin && styles.activeTab]}
                                onPress={() => { setIsLogin(true); setErrorMsg(''); }}
                            >
                                <View style={styles.tabInner}>
                                    <LogIn size={14} color={isLogin ? '#38BDF8' : T.sub} />
                                    <Text style={[styles.tabText, isLogin && styles.activeTabText]}>Login</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, !isLogin && styles.activeTab]}
                                onPress={() => { setIsLogin(false); setErrorMsg(''); }}
                            >
                                <View style={styles.tabInner}>
                                    <UserPlus size={14} color={!isLogin ? '#38BDF8' : T.sub} />
                                    <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>Register</Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {errorMsg ? (
                            <View style={styles.errorBanner}>
                                <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
                            </View>
                        ) : null}

                        {!isLogin ? (
                            <>
                                <InputField
                                    label="Full Name"
                                    icon={<User size={16} color={T.sub} />}
                                    placeholder="e.g. Behroz Musharraf"
                                    value={name}
                                    onChangeText={setName}
                                    autoCapitalize="words"
                                />
                                <InputField
                                    label="Email Address"
                                    icon={<Mail size={16} color={T.sub} />}
                                    placeholder="e.g. behroz@example.com"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </>
                        ) : null}

                        <InputField
                            label="Phone Number (11 digits)"
                            icon={<Phone size={16} color={T.sub} />}
                            placeholder="e.g. 03001234567"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            maxLength={11}
                        />

                        <InputField
                            label="Password"
                            icon={<Lock size={16} color={T.sub} />}
                            placeholder="••••••••"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                        />

                        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                            <LinearGradient
                                colors={['#38BDF8', '#0284C7']}
                                style={styles.submitGrad}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Text style={styles.submitText}>
                                    {isLogin ? 'Login Now' : 'Create Account'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* Footer Tagline */}
                    <Text style={styles.footerText}>Pakistan's first AI-powered home services platform</Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

function InputField({ label, icon, placeholder, value, onChangeText, autoCapitalize, keyboardType, secureTextEntry, maxLength }) {
    return (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.inputWrapper}>
                <View style={styles.inputIcon}>{icon}</View>
                <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor={T.placeholder}
                    value={value}
                    onChangeText={onChangeText}
                    autoCapitalize={autoCapitalize || 'none'}
                    keyboardType={keyboardType || 'default'}
                    secureTextEntry={secureTextEntry || false}
                    maxLength={maxLength}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#0A0B0D',
    },
    scroll: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 36,
    },
    logoIconWrap: {
        width: 80,
        height: 80,
        marginBottom: 16,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoGrad: {
        width: 80,
        height: 80,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(56,189,248,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoGlow: {
        position: 'absolute',
        width: 90,
        height: 90,
        borderRadius: 28,
        backgroundColor: 'rgba(56, 189, 248, 0.06)',
        zIndex: -1,
    },
    logoTitle: {
        fontSize: 34,
        fontWeight: '800',
        color: '#F8FAFC',
        letterSpacing: 1,
        marginBottom: 6,
    },
    logoSubtitle: {
        fontSize: 13,
        color: '#94A3B8',
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    card: {
        backgroundColor: 'rgba(18, 20, 23, 0.95)',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        ...SHADOWS.card,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 14,
        padding: 4,
        marginBottom: 24,
        gap: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 10,
    },
    tabInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    activeTab: {
        backgroundColor: 'rgba(56,189,248,0.10)',
        borderWidth: 1,
        borderColor: 'rgba(56,189,248,0.20)',
    },
    tabText: {
        color: '#94A3B8',
        fontWeight: '700',
        fontSize: 14,
    },
    activeTabText: {
        color: '#38BDF8',
    },
    errorBanner: {
        backgroundColor: 'rgba(239,68,68,0.08)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.2)',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        fontWeight: '600',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
        letterSpacing: 0.2,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 14,
        height: 52,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        color: '#F8FAFC',
        fontSize: 14,
        fontWeight: '500',
    },
    submitBtn: {
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 12,
        ...SHADOWS.btn,
    },
    submitGrad: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    submitText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    footerText: {
        textAlign: 'center',
        color: '#475569',
        fontSize: 12,
        marginTop: 24,
        letterSpacing: 0.2,
    },
});
