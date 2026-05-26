import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRegister, apiLogin, apiCancelBooking, apiCompleteBooking } from './api';

const BookingContext = createContext(null);

const STORAGE_KEY_USER     = '@ahlefun_user';
const STORAGE_KEY_ONBOARD  = '@ahlefun_onboarding';
const STORAGE_KEY_BOOKINGS = '@ahlefun_bookings';
const STORAGE_KEY_THEME    = '@ahlefun_theme';

export function BookingProvider({ children }) {
    const [bookings, setBookings]                 = useState([]);
    const [user, setUser]                         = useState(null);
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
    const [isDarkMode, setIsDarkMode]             = useState(true);
    const [isLoading, setIsLoading]               = useState(true); // prevent flash

    // ─── Hydrate from storage on startup ───────────────────────────────────
    useEffect(() => {
        const restore = async () => {
            try {
                const [userJson, onboardDone, bookingsJson, themeVal] = await Promise.all([
                    AsyncStorage.getItem(STORAGE_KEY_USER),
                    AsyncStorage.getItem(STORAGE_KEY_ONBOARD),
                    AsyncStorage.getItem(STORAGE_KEY_BOOKINGS),
                    AsyncStorage.getItem(STORAGE_KEY_THEME),
                ]);
                if (userJson)    setUser(JSON.parse(userJson));
                if (onboardDone) setHasSeenOnboarding(true);
                if (bookingsJson) {
                    try {
                        const parsed = JSON.parse(bookingsJson);
                        if (Array.isArray(parsed)) {
                            const seen = new Set();
                            const unique = parsed.filter(b => {
                                if (!b || !b.id) return false;
                                if (seen.has(b.id)) return false;
                                seen.add(b.id);
                                return true;
                            });
                            setBookings(unique);
                        } else {
                            setBookings([]);
                        }
                    } catch (err) {
                        console.warn('Failed to parse bookings:', err);
                        setBookings([]);
                    }
                }
                if (themeVal !== null) {
                    setIsDarkMode(themeVal === 'dark');
                }
            } catch (e) {
                console.warn('Failed to restore session:', e);
            } finally {
                setIsLoading(false);
            }
        };
        restore();
    }, []);

    // ─── Persist bookings whenever they change ──────────────────────────────
    useEffect(() => {
        if (!isLoading) {
            AsyncStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(bookings)).catch(() => {});
        }
    }, [bookings, isLoading]);

    // ─── Booking operations ─────────────────────────────────────────────────
    const addBooking = (bookingData, intentData, bookingMeta = {}, rawData = null) => {
        const isScheduled = bookingMeta.timeSlot && !/immediate|as soon as possible/i.test(bookingMeta.timeSlot);
        const entry = {
            id: bookingData.booking_id,
            service: intentData?.service ?? 'Service',
            provider: bookingData.provider,
            status: isScheduled ? 'Scheduled' : 'Pending',
            date: bookingMeta.timeSlot || new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }),
            bookedAt: Date.now(),
            rating: null,
            bookingMeta,
            rawData: rawData || { booking: bookingData, intent: intentData },
        };
        setBookings(prev => {
            if (prev.some(b => b.id === entry.id)) {
                return prev;
            }
            return [entry, ...prev];
        });
        return entry;
    };

    const updateStatus = (id, status) => {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    };

    const cancelBooking = async (id, reason) => {
        const target = bookings.find(b => b.id === id);
        if (!target) return { success: false, error: 'Booking not found.' };

        // Update local state status to Cancelled
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'Cancelled', cancelReason: reason } : b));

        // Release provider on backend
        const providerId = target.rawData?.booking?.provider_id || target.provider?.id;
        if (providerId) {
            try {
                await apiCancelBooking(providerId, reason);
            } catch (err) {
                console.warn('Failed to release provider on backend:', err);
            }
        }
        return { success: true };
    };

    const rateBooking = async (id, rating) => {
        const target = bookings.find(b => b.id === id);
        setBookings(prev => prev.map(b => b.id === id ? { ...b, rating, status: 'Completed' } : b));

        const providerId = target?.rawData?.booking?.provider_id || target?.provider?.id;
        if (providerId) {
            try {
                await apiCompleteBooking(providerId);
            } catch (err) {
                console.warn('Failed to release provider on backend during rating:', err);
            }
        }
    };

    const saveChatHistory = (id, chatMessages, chatHistoryRaw, chatBackend) => {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, chatMessages, chatHistoryRaw, chatBackend } : b));
    };

    // ─── Auth ───────────────────────────────────────────────────────────────
    const login = async (identifier, password) => {
        if (!identifier || !password) return { success: false, error: 'Please enter all fields.' };
        const res = await apiLogin(identifier, password);
        if (res.success) {
            setUser(res.user);
            await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(res.user)).catch(() => {});
            return { success: true };
        }
        return { success: false, error: res.error || 'Login failed.' };
    };

    const register = async (name, email, phone, password) => {
        if (!name || !email || !phone || !password) return { success: false, error: 'Please enter all fields.' };
        const res = await apiRegister(name, email, phone, password);
        if (res.success) {
            setUser(res.user);
            await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(res.user)).catch(() => {});
            return { success: true };
        }
        return { success: false, error: res.error || 'Registration failed.' };
    };

    const logout = async () => {
        setUser(null);
        await AsyncStorage.removeItem(STORAGE_KEY_USER).catch(() => {});
    };

    // ─── Onboarding ─────────────────────────────────────────────────────────
    const completeOnboarding = async () => {
        setHasSeenOnboarding(true);
        await AsyncStorage.setItem(STORAGE_KEY_ONBOARD, 'true').catch(() => {});
    };

    const toggleTheme = async () => {
        const newVal = !isDarkMode;
        setIsDarkMode(newVal);
        await AsyncStorage.setItem(STORAGE_KEY_THEME, newVal ? 'dark' : 'light').catch(() => {});
    };

    return (
        <BookingContext.Provider value={{
            bookings, addBooking, updateStatus, rateBooking, cancelBooking, saveChatHistory,
            user, login, register, logout,
            hasSeenOnboarding, completeOnboarding,
            isDarkMode, toggleTheme,
            isLoading,
        }}>
            {children}
        </BookingContext.Provider>
    );
}

export function useBookings() {
    return useContext(BookingContext);
}
