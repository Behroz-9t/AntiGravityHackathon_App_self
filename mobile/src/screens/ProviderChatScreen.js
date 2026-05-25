import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
    Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    ArrowLeft, Send, MapPin, Clock, Star, ChevronRight,
    MessageCircle, Zap,
} from 'lucide-react-native';
import {
    GEMINI_API_KEY, GROQ_API_KEY,
    GEMINI_MODEL, GROQ_MODEL,
} from '../config';
import { useBookings } from '../BookingContext';
import { getTheme, getGradients } from '../theme';

// ─── AI Backend Labels ────────────────────────────────────────────────────────
const AI_BACKEND = {
    GROQ: 'groq',
    GEMINI: 'gemini',
    NONE: 'none',
};

// ─── Build system prompt ──────────────────────────────────────────────────────
function buildSystemPrompt(provider, intent, bookingMeta) {
    const name     = provider?.provider_name     ?? 'Your Provider';
    const service  = intent?.service             ?? 'home service';
    const location = provider?.location          ?? 'your area';
    const eta      = provider?.estimated_arrival ?? 'shortly';
    const rating   = provider?.rating            ?? '4.5';
    const timeSlot = bookingMeta?.timeSlot       ?? 'as soon as possible';

    return `You are ${name}, a highly professional and experienced ${service} specialist based in ${location}, Pakistan.
You have been assigned to this customer's service request and will arrive in approximately ${eta} (time slot: ${timeSlot}).
Your rating on اہلِ فن platform is ${rating}/5.

YOUR PERSONA:
- Friendly yet professional — like a skilled, confident tradesperson who respects clients
- Naturally mix English with occasional Urdu/Hindustani words: "ji", "bilkul", "haan ji", "zaroor", "theek hai", "koi baat nahi"
- Keep responses concise and practical (2-4 sentences max) — you are a busy professional
- Occasionally mention specific tools or techniques to show expertise
- You are NOT an AI — you are ${name}, a real professional. Never break character.

WHAT YOU KNOW:
- Assigned job: ${service}
- Estimated arrival: ${eta}
- Your location: ${location}
- You have all necessary tools and materials
- Your work comes with a satisfaction guarantee

ON FIRST MESSAGE: Greet warmly, confirm the job and ETA, invite questions.

RULES:
- Pricing: final price agreed on-site after assessment (typical PKR 500–2,000)
- Qualifications: mention experience confidently if asked
- Out-of-scope: refer politely to the right specialist
- No markdown — plain conversational text only
- Never use asterisks or emojis`;
}

// ─── Groq API call (OpenAI-compatible, primary) ───────────────────────────────
async function callGroq(messages) {
    if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages,
            max_tokens: 280,
            temperature: 0.85,
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Groq error ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data.choices[0]?.message?.content?.trim() ?? '';
}

// ─── Gemini SDK call (fallback) ───────────────────────────────────────────────
let _geminiChat = null;
async function callGemini(systemPrompt, history, userMessage) {
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');

    if (!_geminiChat) {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        _geminiChat = model.startChat({
            history: [],
            generationConfig: { maxOutputTokens: 280, temperature: 0.85 },
            systemInstruction: systemPrompt,
        });
    }

    const res = await _geminiChat.sendMessage(userMessage);
    return res.response.text().trim();
}

// ─── Unified send — tries Groq first, falls back to Gemini ───────────────────
async function sendAIMessage({ systemPrompt, groqHistory, geminiHistory, userMessage }) {
    // Try Groq first
    if (GROQ_API_KEY) {
        try {
            const messages = [
                { role: 'system', content: systemPrompt },
                ...groqHistory,
                { role: 'user', content: userMessage },
            ];
            const reply = await callGroq(messages);
            return { reply, backend: AI_BACKEND.GROQ };
        } catch (e) {
            console.warn('Groq failed, falling back to Gemini:', e.message);
        }
    }

    // Fallback to Gemini
    if (GEMINI_API_KEY) {
        try {
            const reply = await callGemini(systemPrompt, geminiHistory, userMessage);
            return { reply, backend: AI_BACKEND.GEMINI };
        } catch (e) {
            console.warn('Gemini also failed:', e.message);
        }
    }

    throw new Error('All AI backends failed. Check your API keys in EAS secrets.');
}

// ─── Typing dot animation ─────────────────────────────────────────────────────
function TypingDot({ delay }) {
    const { isDarkMode } = useBookings();
    const T = getTheme(isDarkMode);
    const styles = makeStyles(T);
    const anim = useRef(new Animated.Value(0.3)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(anim, { toValue: 1, duration: 380, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0.3, duration: 380, useNativeDriver: true }),
            ])
        ).start();
    }, []);
    return <Animated.View style={[styles.typingDot, { opacity: anim }]} />;
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, providerInitial }) {
    const { isDarkMode } = useBookings();
    const T = getTheme(isDarkMode);
    const styles = makeStyles(T);
    const isUser = msg.role === 'user';
    return (
        <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowProvider]}>
            {!isUser && (
                <LinearGradient
                    colors={['rgba(56,189,248,0.22)', 'rgba(56,189,248,0.06)']}
                    style={styles.providerAvatar}
                >
                    <Text style={styles.providerAvatarText}>{providerInitial}</Text>
                </LinearGradient>
            )}
            <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleProvider]}>
                <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextProvider]}>
                    {msg.text}
                </Text>
                <Text style={styles.bubbleTime}>{msg.time}</Text>
            </View>
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProviderChatScreen({ route, navigation }) {
    const insets = useSafeAreaInsets();
    const { isDarkMode, bookings, saveChatHistory } = useBookings();
    const T = getTheme(isDarkMode);
    const G = getGradients(isDarkMode);
    const styles = makeStyles(T);
    const { bookingId, bookingData, intentData, providerData, bookingMeta, userLat, userLng, isOngoingFlow } = route.params ?? {};

    const providerName    = providerData?.provider_name     ?? 'Your Provider';
    const providerInitial = providerName.charAt(0).toUpperCase();
    const service         = intentData?.service             ?? 'service';
    const eta             = providerData?.estimated_arrival ?? 'shortly';
    const rating          = providerData?.rating            ?? '4.5';
    const location        = providerData?.location          ?? '';

    const systemPrompt = buildSystemPrompt(providerData, intentData, bookingMeta);

    // Chat state
    const [messages, setMessages]     = useState([]);
    const [input, setInput]           = useState('');
    const [isTyping, setIsTyping]     = useState(false);
    const [isReady, setIsReady]       = useState(false);
    const [backend, setBackend]       = useState(AI_BACKEND.NONE);
    const [errorMsg, setErrorMsg]     = useState('');

    // Groq history (full OpenAI-format for context)
    const groqHistoryRef = useRef([]);
    const flatRef        = useRef(null);
    const headerAnim     = useRef(new Animated.Value(0)).current;

    const now = () => {
        const d = new Date();
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    const appendMsg = useCallback((role, text) => {
        setMessages(prev => [...prev, {
            id: `${Date.now()}_${role}_${Math.random().toString(36).substring(2, 9)}`,
            role, text, time: now(),
        }]);
    }, []);

    // ── Initialize: get opening greeting ─────────────────────────────────────
    const isInitialMount = useRef(true);
    useEffect(() => {
        if (!isInitialMount.current) return;
        isInitialMount.current = false;

        Animated.timing(headerAnim, {
            toValue: 1, duration: 500, useNativeDriver: true,
        }).start();

        const currentBooking = bookings.find(b => b.id === bookingId);
        if (currentBooking && currentBooking.chatMessages && currentBooking.chatMessages.length > 0) {
            setMessages(currentBooking.chatMessages);
            groqHistoryRef.current = currentBooking.chatHistoryRaw || [];
            if (currentBooking.chatBackend) {
                setBackend(currentBooking.chatBackend);
            }
            setIsReady(true);
            return;
        }

        const init = async () => {
            setIsTyping(true);
            const openingPrompt =
                'Send your opening greeting to the customer. You have just been assigned to their request. ' +
                'Keep it warm, professional, and under 3 sentences.';
            try {
                const { reply, backend: usedBackend } = await sendAIMessage({
                    systemPrompt,
                    groqHistory: [],
                    geminiHistory: [],
                    userMessage: openingPrompt,
                });
                // Store in Groq history for context continuity
                const initialHistory = [
                    { role: 'user', content: openingPrompt },
                    { role: 'assistant', content: reply },
                ];
                groqHistoryRef.current = initialHistory;
                
                const initialMsg = {
                    id: `${Date.now()}_model_${Math.random().toString(36).substring(2, 9)}`,
                    role: 'model', text: reply, time: now(),
                };
                setMessages([initialMsg]);
                setBackend(usedBackend);
                setIsReady(true);
                saveChatHistory(bookingId, [initialMsg], initialHistory, usedBackend);
            } catch (e) {
                // Hard fallback — show a friendly message + clear "no key" warning
                const noKeys = !GROQ_API_KEY && !GEMINI_API_KEY;
                const fallback = noKeys
                    ? `Hello ji! I am ${providerName}, your ${service} specialist. ` +
                      `I will arrive in ${eta}. Feel free to ask me anything!`
                    : `Assalamu Alaikum! Main ${providerName} bol raha hoon. ` +
                      `Aap ka ${service} request mil gaya hai — main ${eta} mein pohunch jaunga. ` +
                      `Koi sawal ho toh zaroor poochein, haan ji!`;
                
                const fallbackMsg = {
                    id: `${Date.now()}_model_${Math.random().toString(36).substring(2, 9)}`,
                    role: 'model', text: fallback, time: now(),
                };
                setMessages([fallbackMsg]);
                setErrorMsg(
                    noKeys
                        ? '⚠️ No API keys found. For local dev: create mobile/.env with your EXPO_PUBLIC_GROQ_API_KEY and EXPO_PUBLIC_GEMINI_API_KEY, then restart Metro.'
                        : 'AI service unavailable. Check your API keys and internet connection.'
                );
                setBackend(AI_BACKEND.NONE);
                setIsReady(true);
                saveChatHistory(bookingId, [fallbackMsg], [], AI_BACKEND.NONE);
            } finally {
                setIsTyping(false);
            }
        };

        init();
    }, [bookingId]);

    // Auto scroll on new messages
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages]);

    // ── Save history when messages change ────────────────────────────────────
    useEffect(() => {
        if (isReady && messages.length > 0) {
            saveChatHistory(bookingId, messages, groqHistoryRef.current, backend);
        }
    }, [messages, isReady, bookingId, backend]);

    // ── Send message ──────────────────────────────────────────────────────────
    const handleSend = async () => {
        const text = input.trim();
        if (!text || isTyping || !isReady) return;

        setInput('');
        appendMsg('user', text);
        setIsTyping(true);
        setErrorMsg('');

        // Add user message to Groq history
        groqHistoryRef.current = [
            ...groqHistoryRef.current,
            { role: 'user', content: text },
        ];

        try {
            const { reply, backend: usedBackend } = await sendAIMessage({
                systemPrompt,
                groqHistory: groqHistoryRef.current.slice(-10), // keep last 5 exchanges
                geminiHistory: [],
                userMessage: text,
            });
            groqHistoryRef.current = [
                ...groqHistoryRef.current,
                { role: 'assistant', content: reply },
            ];
            appendMsg('model', reply);
            setBackend(usedBackend);
        } catch (e) {
            appendMsg('model', 'Sorry, I am having connectivity issues right now. Please try again.');
            setErrorMsg('Message failed — check your API keys.');
        } finally {
            setIsTyping(false);
        }
    };

    // ── Go to Tracking ────────────────────────────────────────────────────────
    const goToTracking = () => {
        navigation.replace('Tracking', {
            bookingId, bookingData, intentData,
            providerData, bookingMeta, userLat, userLng,
        });
    };

    // ── Backend badge ─────────────────────────────────────────────────────────
    const BackendBadge = () => {
        if (backend === AI_BACKEND.GROQ)   return (
            <View style={[styles.infoChip, styles.chipGroq]}>
                <Zap size={11} color="#10B981" fill="#10B981" />
                <Text style={[styles.infoChipText, { color: '#10B981' }]}>Groq · Fast</Text>
            </View>
        );
        if (backend === AI_BACKEND.GEMINI) return (
            <View style={[styles.infoChip, styles.chipGemini]}>
                <Zap size={11} color="#A78BFA" />
                <Text style={[styles.infoChipText, { color: '#A78BFA' }]}>Gemini · Fallback</Text>
            </View>
        );
        return null;
    };

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>

            {/* ── Header ── */}
            <Animated.View style={[styles.header, { opacity: headerAnim }]}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <ArrowLeft size={20} color="#94A3B8" strokeWidth={2} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <LinearGradient
                        colors={['rgba(56,189,248,0.25)', 'rgba(56,189,248,0.07)']}
                        style={styles.headerAvatar}
                    >
                        <Text style={styles.headerAvatarText}>{providerInitial}</Text>
                    </LinearGradient>
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerName} numberOfLines={1}>{providerName}</Text>
                        <View style={styles.headerMeta}>
                            <View style={styles.onlineDot} />
                            <Text style={styles.headerStatus}>{service}</Text>
                            <Text style={styles.headerDot}>·</Text>
                            <Star size={10} color="#D4AF37" fill="#D4AF37" />
                            <Text style={styles.headerRating}>{rating}</Text>
                        </View>
                    </View>
                </View>

                {!isOngoingFlow && (
                    <TouchableOpacity style={styles.trackBtn} onPress={goToTracking} activeOpacity={0.85}>
                        <LinearGradient colors={['#38BDF8', '#0284C7']} style={styles.trackBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                            <Text style={styles.trackBtnText}>Track</Text>
                            <ChevronRight size={14} color="#fff" strokeWidth={2.5} />
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </Animated.View>

            {/* ── Info strip ── */}
            <View style={styles.infoStrip}>
                <View style={styles.infoChip}>
                    <Clock size={11} color="#38BDF8" />
                    <Text style={styles.infoChipText}>ETA: {eta}</Text>
                </View>
                {!!location && (
                    <View style={styles.infoChip}>
                        <MapPin size={11} color="#38BDF8" />
                        <Text style={styles.infoChipText}>{location}</Text>
                    </View>
                )}
                <BackendBadge />
                {!!errorMsg && (
                    <Text style={styles.errorBanner}>{errorMsg}</Text>
                )}
            </View>

            {/* ── Messages + Input ── */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={insets.top + 60}
            >
                <FlatList
                    ref={flatRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.messageList}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyChat}>
                            <MessageCircle size={36} color="rgba(148,163,184,0.25)" />
                            <Text style={styles.emptyChatText}>Connecting to {providerName}…</Text>
                        </View>
                    }
                    ListFooterComponent={
                        isTyping ? (
                            <View style={styles.typingRow}>
                                <LinearGradient
                                    colors={['rgba(56,189,248,0.22)', 'rgba(56,189,248,0.06)']}
                                    style={styles.providerAvatar}
                                >
                                    <Text style={styles.providerAvatarText}>{providerInitial}</Text>
                                </LinearGradient>
                                <View style={styles.typingBubble}>
                                    <View style={styles.typingDots}>
                                        <TypingDot delay={0} />
                                        <TypingDot delay={180} />
                                        <TypingDot delay={360} />
                                    </View>
                                </View>
                            </View>
                        ) : null
                    }
                    renderItem={({ item }) => (
                        <MessageBubble msg={item} providerInitial={providerInitial} />
                    )}
                />

                {/* Input bar */}
                <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
                    <TextInput
                        style={styles.input}
                        value={input}
                        onChangeText={setInput}
                        placeholder={`Ask ${providerName.split(' ')[0]}…`}
                        placeholderTextColor="#475569"
                        multiline
                        maxLength={500}
                        returnKeyType="send"
                        blurOnSubmit={false}
                        onSubmitEditing={handleSend}
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, (!input.trim() || isTyping) && styles.sendBtnDisabled]}
                        onPress={handleSend}
                        disabled={!input.trim() || isTyping}
                        activeOpacity={0.8}
                    >
                        {isTyping
                            ? <ActivityIndicator color="#fff" size={16} />
                            : <Send size={18} color="#fff" strokeWidth={2} />
                        }
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Proceed CTA */}
            {isOngoingFlow && (
                <TouchableOpacity
                    style={[styles.proceedBtn, { marginBottom: insets.bottom + 10 }]}
                    onPress={goToTracking}
                    activeOpacity={0.9}
                >
                    <LinearGradient
                        colors={['#38BDF8', '#0284C7']}
                        style={styles.proceedBtnGrad}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.proceedBtnText}>Proceed to Live Tracking</Text>
                        <ChevronRight size={18} color="#fff" strokeWidth={2.5} />
                    </LinearGradient>
                </TouchableOpacity>
            )}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const makeStyles = (T) => {
    const isDark = T.bg === '#0A0B0D'; // detect theme type
    return StyleSheet.create({
        root: { flex: 1, backgroundColor: T.bg },

        /* Header */
        header: {
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 14, paddingVertical: 12,
            backgroundColor: T.card,
            borderBottomWidth: 1, borderBottomColor: T.border,
            gap: 10,
        },
        backBtn: {
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: T.elevated,
            borderWidth: 1, borderColor: T.border,
            justifyContent: 'center', alignItems: 'center',
        },
        headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
        headerAvatar: {
            width: 40, height: 40, borderRadius: 20,
            borderWidth: 1.5, borderColor: isDark ? 'rgba(56,189,248,0.35)' : 'rgba(56,189,248,0.2)',
            justifyContent: 'center', alignItems: 'center',
        },
        headerAvatarText: { color: '#38BDF8', fontSize: 17, fontWeight: '800' },
        headerInfo: { flex: 1 },
        headerName: { color: T.textLight, fontSize: 15, fontWeight: '700' },
        headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
        onlineDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: T.success },
        headerStatus: { color: T.sub, fontSize: 11 },
        headerDot: { color: T.border, fontSize: 11 },
        headerRating: { color: '#D4AF37', fontSize: 11, fontWeight: '700' },
        trackBtn: { borderRadius: 10, overflow: 'hidden' },
        trackBtnGrad: {
            flexDirection: 'row', alignItems: 'center', gap: 4,
            paddingHorizontal: 12, paddingVertical: 8,
        },
        trackBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

        /* Info strip */
        infoStrip: {
            flexDirection: 'row', gap: 8, flexWrap: 'wrap',
            paddingHorizontal: 14, paddingVertical: 10,
            backgroundColor: T.elevated,
            borderBottomWidth: 1, borderBottomColor: T.border,
        },
        infoChip: {
            flexDirection: 'row', alignItems: 'center', gap: 5,
            backgroundColor: isDark ? 'rgba(56,189,248,0.07)' : 'rgba(56,189,248,0.12)',
            borderWidth: 1, borderColor: isDark ? 'rgba(56,189,248,0.15)' : 'rgba(56,189,248,0.25)',
            borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
        },
        chipGroq: { 
            backgroundColor: isDark ? 'rgba(16,185,129,0.07)' : 'rgba(16,185,129,0.12)', 
            borderColor: isDark ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.25)' 
        },
        chipGemini: { 
            backgroundColor: isDark ? 'rgba(167,139,250,0.07)' : 'rgba(167,139,250,0.12)', 
            borderColor: isDark ? 'rgba(167,139,250,0.2)' : 'rgba(167,139,250,0.25)' 
        },
        infoChipText: { color: '#38BDF8', fontSize: 11, fontWeight: '600' },
        errorBanner: { color: T.error, fontSize: 11, paddingHorizontal: 4, alignSelf: 'center' },

        /* Messages */
        messageList: { padding: 14, paddingBottom: 8, flexGrow: 1 },
        emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
        emptyChatText: { color: T.sub, fontSize: 14 },

        bubbleRow: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-end', gap: 8 },
        bubbleRowUser: { justifyContent: 'flex-end' },
        bubbleRowProvider: { justifyContent: 'flex-start' },
        providerAvatar: {
            width: 30, height: 30, borderRadius: 15,
            borderWidth: 1, borderColor: isDark ? 'rgba(56,189,248,0.3)' : 'rgba(56,189,248,0.2)',
            justifyContent: 'center', alignItems: 'center', flexShrink: 0,
        },
        providerAvatarText: { color: '#38BDF8', fontSize: 12, fontWeight: '800' },

        bubble: { maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
        bubbleUser: { backgroundColor: isDark ? '#0369A1' : '#0284C7', borderBottomRightRadius: 4 },
        bubbleProvider: {
            backgroundColor: T.elevated,
            borderWidth: 1, borderColor: T.border,
            borderBottomLeftRadius: 4,
        },
        bubbleText: { fontSize: 14, lineHeight: 21 },
        bubbleTextUser: { color: '#FFFFFF', fontWeight: '500' },
        bubbleTextProvider: { color: T.textLight },
        bubbleTime: { color: T.sub, fontSize: 10, marginTop: 4, alignSelf: 'flex-end', opacity: 0.7 },

        /* Typing */
        typingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 14 },
        typingBubble: {
            backgroundColor: T.elevated,
            borderWidth: 1, borderColor: T.border,
            borderRadius: 18, borderBottomLeftRadius: 4,
            paddingHorizontal: 16, paddingVertical: 14,
        },
        typingDots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
        typingDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#38BDF8' },

        /* Input */
        inputBar: {
            flexDirection: 'row', alignItems: 'flex-end', gap: 10,
            paddingHorizontal: 14, paddingTop: 10,
            backgroundColor: T.card,
            borderTopWidth: 1, borderTopColor: T.border,
        },
        input: {
            flex: 1, backgroundColor: T.elevated,
            borderWidth: 1, borderColor: T.border,
            borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12,
            color: T.textLight, fontSize: 14, maxHeight: 100,
        },
        sendBtn: {
            width: 44, height: 44, borderRadius: 14,
            backgroundColor: isDark ? '#0369A1' : '#0284C7', justifyContent: 'center', alignItems: 'center', marginBottom: 2,
        },
        sendBtnDisabled: { backgroundColor: isDark ? 'rgba(3,105,161,0.3)' : 'rgba(2,132,199,0.3)' },

        /* Proceed CTA */
        proceedBtn: { marginHorizontal: 14, marginTop: 6, borderRadius: 16, overflow: 'hidden' },
        proceedBtnGrad: {
            flexDirection: 'row', alignItems: 'center',
            justifyContent: 'center', gap: 8, paddingVertical: 16,
        },
        proceedBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
    });
};
