import axios from 'axios';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import Constants from 'expo-constants';

const getBackendUrl = () => {
    // Local development backend
    if (__DEV__) {
        // Attempt to get host IP running the bundler (useful for physical devices over Wi-Fi)
        const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
        if (hostUri) {
            const ip = hostUri.split(':')[0];
            if (ip) {
                return `http://${ip}:8000/api/v1`;
            }
        }

        if (Platform.OS === 'web') {
            return 'http://localhost:8000/api/v1';
        }
        if (Platform.OS === 'android') {
            // Android emulator routes localhost to 10.0.2.2
            return 'http://10.0.2.2:8000/api/v1';
        }
        // iOS simulator
        return 'http://localhost:8000/api/v1';
    }

    // Production: Use deployed backend URL
    return process.env.EXPO_PUBLIC_BACKEND_URL || 'https://hackathonapp-necp.onrender.com/api/v1';
};

const API_BASE_URL = getBackendUrl();

/**
 * Attempt to get device GPS coordinates with robust web & mobile fallbacks.
 * Returns { lat, lng } or null.
 */
export const getUserLocation = async () => {
    // 1. Direct browser Geolocation API for Web (extremely stable on localhost)
    if (Platform.OS === 'web') {
        if (!navigator.geolocation) return null;
        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                },
                () => {
                    resolve(null);
                },
                { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
            );
        });
    }

    // 2. Mobile/Native execution
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return null;

        // Try getting last known position first (instant, avoids hardware lock delays)
        const lastPos = await Location.getLastKnownPositionAsync({});
        if (lastPos && lastPos.coords) {
            return { lat: lastPos.coords.latitude, lng: lastPos.coords.longitude };
        }

        // Fallback to balanced GPS lookup with a 6-second timeout
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 6000)
        );
        const pos = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            timeout,
        ]);
        if (pos && pos.coords) {
            return { lat: pos.coords.latitude, lng: pos.coords.longitude };
        }
        return null;
    } catch (err) {
        console.warn('GPS Fetch Error:', err);
        return null;
    }
};

export const orchestrateRequest = async (query, userCoords = null, bookingMeta = {}) => {
    try {
        const payload = {
            user_id: 'user_demo_1',
            query,
            ...(userCoords && { user_lat: userCoords.lat, user_lng: userCoords.lng }),
            ...(bookingMeta.userPhone && { user_phone: bookingMeta.userPhone }),
            ...(bookingMeta.recipientName && { recipient_name: bookingMeta.recipientName }),
            ...(bookingMeta.recipientPhone && { recipient_phone: bookingMeta.recipientPhone }),
            ...(bookingMeta.recipientAddress && { recipient_address: bookingMeta.recipientAddress }),
            ...(bookingMeta.recipientProvince && { recipient_province: bookingMeta.recipientProvince }),
            ...(bookingMeta.timeSlot && { time_slot: bookingMeta.timeSlot }),
        };
        const response = await axios.post(`${API_BASE_URL}/orchestrate`, payload);
        return response.data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const apiRegister = async (name, email, phone, password) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/register`, {
            name,
            email,
            phone,
            password
        });
        return response.data;
    } catch (error) {
        console.error('Register API Error:', error);
        return { success: false, error: 'Connection failed. Please check if backend is running.' };
    }
};

export const apiLogin = async (identifier, password) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            identifier,
            password
        });
        return response.data;
    } catch (error) {
        console.error('Login API Error:', error);
        return { success: false, error: 'Connection failed. Please check if backend is running.' };
    }
};

export const apiCancelBooking = async (providerId, reason) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/bookings/cancel`, {
            provider_id: providerId,
            reason: reason
        });
        return response.data;
    } catch (error) {
        console.error('Cancel Booking API Error:', error);
        return { success: false, error: 'Connection failed.' };
    }
};
