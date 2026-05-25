import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { navigationRef } from './src/navigationRef';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ErrorBoundary from './src/ErrorBoundary';
import { BookingProvider, useBookings } from './src/BookingContext';
import { SidePanelProvider } from './src/components/SidePanelContext';
import AuthenticatedLayout from './src/components/AuthenticatedLayout';

import HomeScreen        from './src/screens/HomeScreen';
import ResultsScreen     from './src/screens/ResultsScreen';
import BookingScreen     from './src/screens/BookingScreen';
import ReasoningScreen   from './src/screens/ReasoningScreen';
import HistoryScreen     from './src/screens/HistoryScreen';
import TrackingScreen    from './src/screens/TrackingScreen';
import AuthScreen        from './src/screens/AuthScreen';
import OnboardingScreen  from './src/screens/OnboardingScreen';
import ProviderChatScreen from './src/screens/ProviderChatScreen';

const Stack = createNativeStackNavigator();

function AuthenticatedNavigator() {
    return (
        <SidePanelProvider>
            <AuthenticatedLayout>
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="Home"         component={HomeScreen} />
                    <Stack.Screen name="Reasoning"    component={ReasoningScreen} />
                    <Stack.Screen name="Results"      component={ResultsScreen} />
                    <Stack.Screen name="Booking"      component={BookingScreen} />
                    <Stack.Screen name="ProviderChat" component={ProviderChatScreen} />
                    <Stack.Screen name="Tracking"     component={TrackingScreen} />
                    <Stack.Screen name="History"      component={HistoryScreen} />
                </Stack.Navigator>
            </AuthenticatedLayout>
        </SidePanelProvider>
    );
}

function AppNavigator() {
    const { user, hasSeenOnboarding, isLoading } = useBookings();

    // Show a dark splash while AsyncStorage is restoring the session
    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#0A0B0D', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color="#38BDF8" size="large" />
            </View>
        );
    }

    return (
        <NavigationContainer ref={navigationRef}>
            <StatusBar style="light" />
            <Stack.Navigator
                screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0B0D' } }}
            >
                {!hasSeenOnboarding ? (
                    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                ) : user ? (
                    <Stack.Screen
                        name="AuthenticatedStack"
                        component={AuthenticatedNavigator}
                        options={{ headerShown: false }}
                    />
                ) : (
                    <Stack.Screen name="Auth" component={AuthScreen} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}

export default function App() {
    return (
        <SafeAreaProvider>
            <ErrorBoundary>
                <BookingProvider>
                    <AppNavigator />
                </BookingProvider>
            </ErrorBoundary>
        </SafeAreaProvider>
    );
}
