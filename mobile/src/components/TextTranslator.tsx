import React from 'react';
import { View } from 'react-native';
import TranslatorInterface from './TranslatorInterface';

const TextTranslator: React.FC = () => {
    return (
        <View>
            {/* The existing TranslatorInterface component already handles text input + translation */}
            <TranslatorInterface />
        </View>
    );
};

export default TextTranslator;
