/**
 * notifications.js
 * Cross-platform notification utility for AntiGravity.
 *
 * On Web  → uses the browser's Notification API (requires user permission).
 * On Native (Android/iOS) → uses expo-notifications for local scheduled push.
 */
import { Platform } from 'react-native';

/* ─── Lazy import for native-only package ─────────────────────────────── */
let Notifications = null;
if (Platform.OS !== 'web') {
    try {
        Notifications = require('expo-notifications');
    } catch (_) { /* dev/web fallback */ }
}

/* ─── Permission helper ───────────────────────────────────────────────── */
export async function requestNotificationPermission() {
    try {
        if (Platform.OS === 'web') {
            if (!('Notification' in window)) return false;
            const result = await Notification.requestPermission();
            return result === 'granted';
        }
        if (!Notifications) return false;
        const { status } = await Notifications.requestPermissionsAsync();
        return status === 'granted';
    } catch (err) {
        console.warn('Failed to request notification permission:', err);
        return false;
    }
}

/* ─── Immediate notification ──────────────────────────────────────────── */
/**
 * Show an immediate push notification right now.
 * @param {string} title
 * @param {string} body
 */
export async function sendImmediateNotification(title, body) {
    try {
        const granted = await requestNotificationPermission();
        if (!granted) return;

        if (Platform.OS === 'web') {
            try {
                new Notification(title, { body, icon: '/favicon.ico' });
            } catch (_) {}
            return;
        }

        if (!Notifications) return;
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowBanner: true,
                shouldShowList: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
            }),
        });
        await Notifications.scheduleNotificationAsync({
            content: { title, body, sound: true },
            trigger: null, // Immediate
        });
    } catch (err) {
        console.warn('Failed to send immediate notification:', err);
    }
}

/* ─── Scheduled notification (2 hrs before slot) ─────────────────────── */
/**
 * Schedule a reminder notification 2 hours before the scheduled booking time.
 * Falls back to an immediate notification on web (since Web Notifications
 * cannot be scheduled into the future by the browser alone).
 *
 * @param {string} title
 * @param {string} body
 * @param {Date}   scheduledDate  – the booking Date object
 * @returns {string|null}  notificationId (native) or null (web)
 */
export async function scheduleReminderNotification(title, body, scheduledDate) {
    try {
        const granted = await requestNotificationPermission();
        if (!granted) return null;

        const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
        const reminderTime = new Date(scheduledDate.getTime() - TWO_HOURS_MS);
        const now = Date.now();

        if (Platform.OS === 'web') {
            // Web cannot truly schedule future notifications; use setTimeout instead.
            const delay = reminderTime.getTime() - now;
            if (delay > 0) {
                setTimeout(() => {
                    try {
                        new Notification(title, { body, icon: '/favicon.ico' });
                    } catch (_) {}
                }, delay);
            }
            return null;
        }

        if (!Notifications) return null;
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowBanner: true,
                shouldShowList: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
            }),
        });

        // If the reminder time has already passed, fire immediately
        const trigger = reminderTime.getTime() > now
            ? { date: reminderTime }
            : null;

        const id = await Notifications.scheduleNotificationAsync({
            content: { title, body, sound: true },
            trigger,
        });
        return id;
    } catch (err) {
        console.warn('Failed to schedule reminder notification:', err);
        return null;
    }
}

