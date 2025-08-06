import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

// Note: In a real app, you'd want to install a vector icon library like react-native-vector-icons
// or use an SVG library for the icons

interface HeaderProps {
    onOpenSettings?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
    return (
        <View style={styles.header}>
            <View style={styles.container}>
                <View style={styles.leftSection}>
                    <View style={styles.logoContainer}>
                        {/* This would be your Globe icon */}
                        <Text style={styles.logoIcon}>🌐</Text>
                    </View>
                    <View>
                        <Text style={styles.title}>Voice Translator</Text>
                        <Text style={styles.subtitle}>Translate text and speech in real-time</Text>
                    </View>
                </View>
                <View style={styles.rightSection}>
                    <View style={styles.featureBadge}>
                        <Text style={styles.featureText}>🌍 Multi-language</Text>
                    </View>
                    {onOpenSettings && (
                        <TouchableOpacity style={styles.settingsButton} onPress={onOpenSettings}>
                            <Text style={styles.settingsIcon}>⚙️</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#4f46e5', // primary-600
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    logoIcon: {
        fontSize: 20,
        color: 'white',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827', // secondary-900
    },
    subtitle: {
        fontSize: 12,
        color: '#4b5563', // secondary-600
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    featureBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    featureText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#4b5563', // secondary-600
    },
    settingsButton: {
        padding: 8,
        borderRadius: 20,
    },
    settingsIcon: {
        fontSize: 18,
    }
});

export default Header;
