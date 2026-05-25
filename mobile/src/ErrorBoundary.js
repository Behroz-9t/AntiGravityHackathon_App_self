import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('App crashed:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <Text style={styles.title}>⚠️ Something went wrong</Text>
                    <Text style={styles.errorMsg}>{this.state.error?.toString()}</Text>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => this.setState({ hasError: false, error: null })}
                    >
                        <Text style={styles.buttonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#12121A', justifyContent: 'center', alignItems: 'center', padding: 24 },
    title: { color: '#FF6B6B', fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
    errorMsg: { color: '#E2E8F0', fontSize: 13, textAlign: 'center', marginBottom: 24, fontFamily: 'monospace' },
    button: { backgroundColor: '#00E5FF', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
    buttonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
});

export default ErrorBoundary;
