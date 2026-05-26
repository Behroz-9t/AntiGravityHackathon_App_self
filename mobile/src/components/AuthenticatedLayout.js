import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSidePanel } from './SidePanelContext';
import SidePanel from './SidePanel';
import { Menu, X } from 'lucide-react-native';
import { useBookings } from '../BookingContext';
import { getTheme } from '../theme';

const MOBILE_BREAKPOINT = 768;

export default function AuthenticatedLayout({ children }) {
    const { isOpen, togglePanel } = useSidePanel();
    const { width: screenWidth } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useBookings();
    const T = getTheme(isDarkMode);
    const styles = makeStyles(T);
    const isMobile = screenWidth < MOBILE_BREAKPOINT;

    // Root screen scale-down and shift animation (100% native driver optimized)
    const layoutProgress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(layoutProgress, {
            toValue: isOpen ? 1 : 0,
            duration: 250,
            useNativeDriver: true,
        }).start();
    }, [isOpen]);

    const contentScale = layoutProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.96],
    });

    const contentTranslateX = layoutProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 14],
    });

    if (isMobile) {
        return (
            // This View is the root that the absolutely-positioned SidePanel slides over
            <View style={styles.mobileRoot}>
                <Animated.View
                    style={[
                        { flex: 1, backgroundColor: T.bg },
                        {
                            transform: [
                                { scale: contentScale },
                                { translateX: contentTranslateX }
                            ],
                            borderRadius: 16,
                            overflow: 'hidden',
                        }
                    ]}
                >
                    {/* Fixed header bar */}
                    <View style={[styles.mobileHeader, { paddingTop: insets.top + 8 }]}>
                        <TouchableOpacity
                            style={styles.hamburgerBtn}
                            onPress={togglePanel}
                            activeOpacity={0.7}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            {isOpen
                                ? <X size={20} color={T.accent1} strokeWidth={2.5} />
                                : <Menu size={20} color={T.accent1} strokeWidth={2.5} />
                            }
                        </TouchableOpacity>

                        <Text style={styles.headerTitle}>اہلِ فن</Text>

                        {/* Spacer to balance the hamburger on the left */}
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Scrollable content area below header */}
                    <View style={styles.mobileContent}>
                        {children}
                    </View>
                </Animated.View>

                {/* SidePanel overlays the entire mobileRoot */}
                <SidePanel />
            </View>
        );
    }

    // Desktop/Tablet: permanent split-view
    return (
        <View style={styles.desktopContainer}>
            <View style={styles.desktopPanel}>
                <SidePanel />
            </View>
            <View style={styles.desktopContent}>
                {children}
            </View>
        </View>
    );
}

const makeStyles = (T) => {
    const isDark = true;
    return StyleSheet.create({
        /* ── Mobile ─────────────────────────────────────────────── */
        mobileRoot: {
            flex: 1,
            backgroundColor: T.bg,
        },
        mobileHeader: {
            backgroundColor: 'rgba(14, 16, 20, 0.97)',
            borderBottomWidth: 1,
            borderBottomColor: T.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingBottom: 12,
            zIndex: 10,
            // Shadow for depth
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
        },
        hamburgerBtn: {
            width: 40,
            height: 40,
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 12,
            backgroundColor: 'rgba(245, 197, 24, 0.08)',
            borderWidth: 1,
            borderColor: 'rgba(245, 197, 24, 0.18)',
        },
        headerTitle: {
            color: T.textLight,
            fontSize: 20,
            fontWeight: '800',
            letterSpacing: 0.5,
        },
        mobileContent: {
            flex: 1,
        },

        /* ── Desktop ─────────────────────────────────────────────── */
        desktopContainer: {
            flex: 1,
            flexDirection: 'row',
        },
        desktopPanel: {
            width: 280,
            borderRightWidth: 1,
            borderRightColor: T.border,
        },
        desktopContent: {
            flex: 1,
        },
    });
};
