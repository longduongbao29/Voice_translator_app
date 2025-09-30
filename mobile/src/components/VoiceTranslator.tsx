import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import TranslatorInterface from './TranslatorInterface';

const VoiceTranslator: React.FC = () => {
    return (
        <View style={styles.container}>
            {/* Reuse existing TranslatorInterface which includes recording controls
          If you later want to split logic, create a dedicated voice-only UI here. */}
            <TranslatorInterface />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingTop: 8,
    },
});

export default VoiceTranslator;
