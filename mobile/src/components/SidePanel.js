import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, Animated, TouchableOpacity, ScrollView,
    SafeAreaView, useWindowDimensions, Switch,
} from 'react-native';
import { navigationRef } from '../navigationRef';
import { useSidePanel } from './SidePanelContext';
import { useBookings } from '../BookingContext';
import { getTheme, getGradients, SHADOWS } from '../theme';
import { downloadBookingLogs } from '../utils/logExporter';
import {
    Calendar, Bot, LogOut, Inbox, Download, X, Star,
    ChevronDown, ChevronUp, MessageCircle, MapPin,
} from 'lucide-react-native';

const PANEL_WIDTH = 280;
const MOBILE_BREAKPOINT = 768;

export default function SidePanel() {
    const { isOpen, activeTab, closePanel, switchTab } = useSidePanel();
    const { user, bookings, logout, isDarkMode, toggleTheme } = useBookings();
    const { width: screenWidth } = useWindowDimensions();
    const T = getTheme(isDarkMode);
    const G = getGradients(isDarkMode);
    const styles = makeStyles(T);
    // Use a 0→1 progress value — safer with useNativeDriver
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(progress, {
            toValue: isOpen ? 1 : 0,
            duration: 280,
            useNativeDriver: true,
        }).start();
    }, [isOpen]);

    const [expandedBookingId, setExpandedBookingId] = useState(null);

    const toggleExpandBooking = (bookingId) => {
        setExpandedBookingId(prev => prev === bookingId ? null : bookingId);
    };

    const activeBookings = bookings.filter(b =>
        ['Pending', 'Arriving', 'Working', 'Scheduled'].includes(b.status)
    );
    const completedBookings = bookings.filter(b =>
        ['Completed', 'Cancelled'].includes(b.status)
    );

    const renderProfileSection = () => (
        <View style={styles.profileSection}>
            {isMobile && (
                <TouchableOpacity style={styles.closeBtn} onPress={closePanel} activeOpacity={0.7}>
                    <X size={20} color={T.sub} />
                </TouchableOpacity>
            )}
            <View style={styles.avatarContainer}>
                {/* Sleek silhouette placeholder logo */}
                <View style={styles.avatarGlow} />
                <View style={styles.avatarPlaceholder}>
                    <View style={styles.silhouetteHead} />
                    <View style={styles.silhouetteBody} />
                </View>
            </View>
            <Text style={styles.userName}>{user?.name || 'Guest User'}</Text>
            <Text style={styles.userPhone}>{user?.phone || 'اہلِ فن سروس'}</Text>
            {user && (
                <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                    <LogOut size={13} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            )}
            <View style={styles.divider} />
        </View>
    );

    const renderTabBar = () => (
        <View style={styles.tabBar}>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'workflows' && styles.tabActive]}
                onPress={() => switchTab('workflows')}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Bot size={16} color={activeTab === 'workflows' ? T.accent1 : T.sub} />
                    <Text style={[styles.tabText, activeTab === 'workflows' && styles.tabTextActive]}>
                        Workflows
                    </Text>
                </View>
                {activeTab === 'workflows' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'bookings' && styles.tabActive]}
                onPress={() => switchTab('bookings')}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Calendar size={16} color={activeTab === 'bookings' ? T.accent1 : T.sub} />
                    <Text style={[styles.tabText, activeTab === 'bookings' && styles.tabTextActive]}>
                        Bookings
                    </Text>
                </View>
                {activeTab === 'bookings' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
        </View>
    );

    const renderBookingsTab = () => (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            {activeBookings.length > 0 && (
                <>
                    <Text style={styles.sectionTitle}>Active</Text>
                    {activeBookings.map(booking => (
                        <View key={booking.id} style={styles.bookingCard}>
                            <View style={styles.bookingHeader}>
                                <Text style={styles.bookingService} numberOfLines={1}>{booking.service}</Text>
                                <Text style={[styles.bookingStatus, { color: T.accent1, fontWeight: '800' }]}>
                                    ● {booking.status}
                                </Text>
                            </View>
                            <Text style={styles.bookingProvider}>
                                {booking.provider?.provider_name || booking.provider || 'Provider'}
                            </Text>
                            <Text style={styles.bookingDate}>{booking.date}</Text>

                            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                                {/* Talk to AI Agent button */}
                                <TouchableOpacity
                                    style={styles.chatBtn}
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        closePanel();
                                        if (navigationRef.isReady()) {
                                            navigationRef.navigate('ProviderChat', {
                                                bookingId:    booking.id,
                                                bookingData:  booking.rawData?.booking,
                                                intentData:   booking.rawData?.intent,
                                                providerData: booking.provider,
                                                bookingMeta:  booking.bookingMeta,
                                            });
                                        }
                                    }}
                                >
                                    <MessageCircle size={12} color={T.accent1} strokeWidth={2} />
                                    <Text style={[styles.chatBtnText, { fontSize: 10 }]}>Talk to AI</Text>
                                </TouchableOpacity>

                                {/* Track Live button */}
                                <TouchableOpacity
                                    style={[styles.chatBtn, { borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,0.08)' }]}
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        closePanel();
                                        if (navigationRef.isReady()) {
                                            navigationRef.navigate('Tracking', {
                                                bookingId:    booking.id,
                                                bookingData:  booking.rawData?.booking,
                                                intentData:   booking.rawData?.intent,
                                                providerData: booking.provider,
                                                bookingMeta:  booking.bookingMeta,
                                                userLat:      booking.rawData?.user_lat,
                                                userLng:      booking.rawData?.user_lng,
                                            });
                                        }
                                    }}
                                >
                                    <MapPin size={12} color="#22C55E" strokeWidth={2} />
                                    <Text style={[styles.chatBtnText, { color: '#22C55E', fontSize: 10 }]}>Track Live</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </>
            )}

            {completedBookings.length > 0 && (
                <>
                    <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Completed & History</Text>
                    {completedBookings.map(booking => {
                        const isCancelled = booking.status === 'Cancelled';
                        return (
                            <View 
                                key={booking.id} 
                                style={[
                                    styles.bookingCard, 
                                    isCancelled ? styles.bookingCardCancelled : styles.bookingCardCompleted,
                                    { backgroundColor: isCancelled ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.04)' }
                                ]}
                            >
                                <View style={styles.bookingHeader}>
                                    <Text style={[styles.bookingService, { color: T.textLight }]} numberOfLines={1}>{booking.service}</Text>
                                    {isCancelled ? (
                                        <Text style={[styles.bookingStatus, { color: '#EF4444', fontWeight: '800' }]}>
                                            ● Cancelled
                                        </Text>
                                    ) : (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <Star size={11} color="#D4AF37" fill="#D4AF37" />
                                            <Text style={styles.rating}>{booking.rating || 'N/A'}</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={[styles.bookingProvider, { color: T.sub }]}>
                                    {booking.provider?.provider_name || booking.provider || 'Provider'}
                                </Text>
                                <Text style={[styles.bookingDate, { color: T.sub }]}>{booking.date}</Text>
                                
                                {isCancelled && booking.cancelReason && (
                                    <Text style={[styles.bookingDate, { color: '#EF4444', fontStyle: 'italic', marginTop: 4 }]}>
                                        Reason: {booking.cancelReason}
                                    </Text>
                                )}

                                {/* Talk to AI Agent button — only for non-cancelled bookings */}
                                {!isCancelled && (
                                    <TouchableOpacity
                                        style={[styles.chatBtn, styles.chatBtnCompleted]}
                                        activeOpacity={0.8}
                                        onPress={() => {
                                            closePanel();
                                            if (navigationRef.isReady()) {
                                                navigationRef.navigate('ProviderChat', {
                                                    bookingId:    booking.id,
                                                    bookingData:  booking.rawData?.booking,
                                                    intentData:   booking.rawData?.intent,
                                                    providerData: booking.provider,
                                                    bookingMeta:  booking.bookingMeta,
                                                });
                                            }
                                        }}
                                    >
                                        <MessageCircle size={13} color="#94A3B8" strokeWidth={2} />
                                        <Text style={[styles.chatBtnText, { color: '#94A3B8' }]}>Talk to AI Agent</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    })}
                </>
            )}

            {bookings.length === 0 && (
                <View style={styles.emptyState}>
                    <Inbox size={44} color={T.sub} style={{ marginBottom: 12 }} />
                    <Text style={styles.emptyText}>No bookings yet</Text>
                    <Text style={styles.emptySubtext}>Create your first booking!</Text>
                </View>
            )}

            <View style={{ height: 20 }} />
        </ScrollView>
    );

    const renderWorkflowsTab = () => (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            {bookings.length > 0 ? (
                bookings.map((booking) => {
                    const isExpanded = expandedBookingId === booking.id;
                    const logs = booking.rawData?.logs || [];
                    
                    return (
                        <View key={booking.id} style={[styles.workflowCard, isExpanded && styles.workflowCardExpanded]}>
                            <TouchableOpacity 
                                style={styles.workflowHeaderTouch}
                                onPress={() => toggleExpandBooking(booking.id)}
                                activeOpacity={0.8}
                            >
                                <View style={{ flex: 1 }}>
                                    <View style={styles.workflowHeader}>
                                        <Text style={styles.workflowService}>{booking.service}</Text>
                                        <Text style={[styles.workflowStatusText, {
                                            color: booking.status === 'Completed' ? '#10B981' : T.accent1
                                        }]}>
                                            ● {booking.status}
                                        </Text>
                                    </View>
                                    <Text style={styles.workflowProvider}>{booking.provider?.provider_name || booking.provider || 'Provider'}</Text>
                                    <Text style={styles.workflowDate}>{booking.date}</Text>
                                </View>
                                {isExpanded
                                    ? <ChevronUp size={16} color={T.sub} />
                                    : <ChevronDown size={16} color={T.sub} />}
                            </TouchableOpacity>

                            {isExpanded && (
                                <View style={styles.workflowDetails}>
                                    <View style={styles.detailsDivider} />
                                    
                                    {/* Action button to download logs */}
                                    <TouchableOpacity 
                                        style={styles.sideDownloadBtn}
                                        onPress={() => {
                                            const logsData = {
                                                bookingId: booking.id,
                                                service: booking.service,
                                                provider: booking.provider?.provider_name || booking.provider || 'Provider',
                                                status: booking.status,
                                                date: booking.date,
                                                rating: booking.rating,
                                                startTime: booking.bookedAt,
                                                endTime: Date.now(),
                                                meta: {
                                                    bookingMeta: booking.bookingMeta,
                                                    intent: booking.rawData?.intent,
                                                    ranking: booking.rawData?.ranking,
                                                    logs: logs || [],
                                                }
                                            };
                                            downloadBookingLogs(logsData);
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Download size={13} color={T.accent1} />
                                            <Text style={styles.sideDownloadBtnText}>Download Technical Logs</Text>
                                        </View>
                                    </TouchableOpacity>

                                    {/* Vertical Timeline Stepper of Agents */}
                                    <Text style={styles.timelineTitle}>Agent Pipeline Steps</Text>
                                    {logs.length > 0 ? (
                                        <View style={styles.timelineContainer}>
                                            {logs.map((log, idx) => {
                                                const isOk = log.status === 'Completed';
                                                const isFail = log.status === 'Failed';
                                                const circleColor = isOk ? '#22C55E' : isFail ? '#EF4444' : '#F59E0B';
                                                
                                                return (
                                                    <View key={idx} style={styles.timelineItem}>
                                                        {/* Left line & bullet */}
                                                        <View style={styles.timelineIndicator}>
                                                            <View style={[styles.timelineBullet, { backgroundColor: circleColor }]} />
                                                            {idx < logs.length - 1 && <View style={styles.timelineLine} />}
                                                        </View>
                                                        
                                                        {/* Right content */}
                                                        <View style={styles.timelineContent}>
                                                            <Text style={styles.timelineAgent}>{log.agent}</Text>
                                                            <Text style={styles.timelineAction}>{log.action}</Text>
                                                        </View>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    ) : (
                                        <Text style={styles.noLogsText}>No pipeline steps recorded.</Text>
                                    )}
                                </View>
                            )}
                        </View>
                    );
                })
            ) : (
                <View style={styles.emptyState}>
                    <Bot size={44} color={T.sub} style={{ marginBottom: 12 }} />
                    <Text style={styles.emptyText}>No workflows yet</Text>
                    <Text style={styles.emptySubtext}>Start a booking to see workflows</Text>
                </View>
            )}
            <View style={{ height: 20 }} />
        </ScrollView>
    );

    const isMobile = screenWidth < MOBILE_BREAKPOINT;

    const translateX = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [-PANEL_WIDTH, 0],
    });
    const backdropOpacity = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    // Don't render side panel on mobile unless explicitly toggled
    if (isMobile) {
        return (
            <>
                {/* Backdrop — always rendered, just invisible when closed */}
                <Animated.View
                    pointerEvents={isOpen ? 'auto' : 'none'}
                    style={[
                        styles.backdrop,
                        { opacity: backdropOpacity },
                    ]}
                >
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={closePanel}
                        activeOpacity={1}
                    />
                </Animated.View>

                {/* Sliding Panel */}
                <Animated.View
                    style={[
                        styles.panelContainer,
                        styles.panelMobile,
                        { transform: [{ translateX }], backgroundColor: T.card, borderRightColor: T.border },
                    ]}
                    pointerEvents={isOpen ? 'auto' : 'none'}
                >
                    <SafeAreaView style={[styles.panelContent, { backgroundColor: T.card }]}>
                        {renderProfileSection()}
                        {renderTabBar()}
                        {activeTab === 'bookings' ? renderBookingsTab() : renderWorkflowsTab()}
                    </SafeAreaView>
                </Animated.View>
            </>
        );
    }

    // Desktop/tablet: Always visible split-view
    return (
        <View style={[styles.panelContainer, { backgroundColor: T.card, borderRightColor: T.border }]}>
            <SafeAreaView style={[styles.panelContent, { backgroundColor: T.card }]}>
                {renderProfileSection()}
                {renderTabBar()}
                {activeTab === 'bookings' ? renderBookingsTab() : renderWorkflowsTab()}
            </SafeAreaView>
        </View>
    );
}

const makeStyles = (T) => StyleSheet.create({
    panelContainer: {
        width: PANEL_WIDTH,
        backgroundColor: T.card,
        borderRightWidth: 1,
        borderRightColor: T.border,
        ...SHADOWS.card,
    },
    panelMobile: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 1000,
        elevation: 20,
    },
    panelContent: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        zIndex: 999,
        elevation: 19,
    },

    closeBtn: {
        alignSelf: 'flex-end',
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: T.border,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    // Profile Section
    profileSection: {
        alignItems: 'center',
        paddingTop: T.sp4,
        paddingBottom: T.sp4,
        paddingHorizontal: T.sp4,
    },
    avatarContainer: {
        marginBottom: T.sp4,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarGlow: {
        position: 'absolute',
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(245, 197, 24, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(245, 197, 24, 0.16)',
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#0B0C0E',
        borderWidth: 2,
        borderColor: T.accent1,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    silhouetteHead: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#334155',
        marginTop: 6,
    },
    silhouetteBody: {
        width: 32,
        height: 20,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        backgroundColor: '#334155',
        marginTop: 4,
    },
    avatarText: {
        fontSize: 24,
        fontWeight: '700',
        color: T.accent1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
        color: T.textLight,
        marginBottom: 4,
    },
    userPhone: {
        fontSize: 12,
        color: T.sub,
        marginBottom: T.sp4,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: T.sp2,
        paddingHorizontal: T.sp3,
        backgroundColor: 'rgba(239,68,68,0.08)',
        borderRadius: T.r2,
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.2)',
        gap: 6,
    },
    logoutText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#EF4444',
    },
    divider: {
        width: '100%',
        height: 1,
        backgroundColor: T.border,
        marginTop: T.sp4,
    },

    // Tab Bar
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: T.border,
        paddingHorizontal: T.sp2,
    },
    tab: {
        flex: 1,
        paddingVertical: T.sp3,
        alignItems: 'center',
        position: 'relative',
    },
    tabActive: {
        borderBottomWidth: 2,
        borderBottomColor: T.accent1,
    },
    tabText: {
        fontSize: 12,
        fontWeight: '600',
        color: T.sub,
    },
    tabTextActive: {
        color: T.accent1,
        fontWeight: '700',
    },
    tabIndicator: {
        position: 'absolute',
        bottom: -1,
        width: '80%',
        height: 2,
        backgroundColor: T.accent1,
    },

    // Tab Content
    tabContent: {
        flex: 1,
        paddingHorizontal: T.sp3,
        paddingTop: T.sp4,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: T.sub,
        textTransform: 'uppercase',
        marginBottom: T.sp2,
        letterSpacing: 0.5,
    },

    // Booking Card
    bookingCard: {
        backgroundColor: T.elevated,
        borderRadius: T.r3,
        padding: T.sp3,
        marginBottom: T.sp2,
        borderWidth: 1,
        borderColor: T.border,
    },
    bookingCardCompleted: {
        borderColor: 'rgba(16, 185, 129, 0.2)',
        backgroundColor: 'rgba(16, 185, 129, 0.04)',
    },
    bookingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    bookingService: {
        fontSize: 13,
        fontWeight: '700',
        color: T.textLight,
    },
    bookingStatus: {
        fontSize: 11,
        fontWeight: '700',
    },
    bookingProvider: {
        fontSize: 11,
        color: T.sub,
        marginBottom: 2,
    },
    bookingDate: {
        fontSize: 10,
        color: T.sub,
        marginBottom: 8,
    },
    chatBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(245,197,24,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(245,197,24,0.2)',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        alignSelf: 'flex-start',
    },
    chatBtnCompleted: {
        backgroundColor: 'rgba(148,163,184,0.06)',
        borderColor: 'rgba(148,163,184,0.15)',
    },
    chatBtnText: {
        color: T.accent1,
        fontSize: 11,
        fontWeight: '700',
    },
    rating: {
        fontSize: 11,
        color: '#D4AF37',
        fontWeight: '600',
    },

    // Workflow Card
    workflowCard: {
        backgroundColor: T.elevated,
        borderRadius: T.r3,
        padding: T.sp3,
        marginBottom: T.sp2,
        borderWidth: 1,
        borderColor: T.border,
    },
    workflowCardExpanded: {
        borderColor: 'rgba(245, 197, 24, 0.25)',
    },
    workflowHeaderTouch: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    workflowHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    workflowService: {
        fontSize: 13,
        fontWeight: '700',
        color: T.textLight,
    },
    workflowStatusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    workflowProvider: {
        fontSize: 11,
        color: T.sub,
        marginBottom: 2,
    },
    workflowDate: {
        fontSize: 10,
        color: T.sub,
    },
    expandChevron: {
        fontSize: 12,
        color: T.sub,
        paddingHorizontal: 4,
    },
    
    // Workflow Details Accordion
    workflowDetails: {
        marginTop: 12,
    },
    detailsDivider: {
        height: 1,
        backgroundColor: T.border,
        marginBottom: 12,
    },
    sideDownloadBtn: {
        backgroundColor: 'rgba(245, 197, 24, 0.08)',
        borderRadius: T.r2,
        paddingVertical: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(245, 197, 24, 0.20)',
        marginBottom: 16,
    },
    sideDownloadBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: T.accent1,
    },
    timelineTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: T.sub,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 10,
    },
    timelineContainer: {
        paddingLeft: 4,
    },
    timelineItem: {
        flexDirection: 'row',
        minHeight: 44,
    },
    timelineIndicator: {
        width: 16,
        alignItems: 'center',
    },
    timelineBullet: {
        width: 8,
        height: 8,
        borderRadius: 4,
        zIndex: 2,
        marginTop: 4,
    },
    timelineLine: {
        position: 'absolute',
        top: 8,
        bottom: -4,
        width: 1,
        backgroundColor: T.border,
        zIndex: 1,
    },
    timelineContent: {
        flex: 1,
        paddingLeft: 12,
        paddingBottom: 10,
    },
    timelineAgent: {
        fontSize: 11,
        fontWeight: '700',
        color: T.textLight,
    },
    timelineAction: {
        fontSize: 10,
        color: T.sub,
        marginTop: 2,
    },
    noLogsText: {
        fontSize: 11,
        color: T.sub,
        fontStyle: 'italic',
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: T.sp10,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: T.sp3,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '600',
        color: T.textLight,
        marginBottom: 4,
    },
    emptySubtext: {
        fontSize: 12,
        color: T.sub,
    },
    bookingCardCancelled: {
        borderColor: 'rgba(239, 68, 68, 0.2)',
        backgroundColor: 'rgba(239, 68, 68, 0.04)',
    },
    themeToggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    themeToggleText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
