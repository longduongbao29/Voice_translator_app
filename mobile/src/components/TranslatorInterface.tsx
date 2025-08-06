import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import LanguageSelector from './LanguageSelector';
import TextArea from './TextArea';
import useAudioRecorder from '../hooks/useAudioRecorder';
import useSpeechSynthesis from '../hooks/useSpeechSynthesis';
import { translateText, convertSpeechToText } from '../services/api';
import { Language } from '../types';
import Clipboard from '@react-native-clipboard/clipboard';

// Sample language list - you would typically fetch this from your backend
const LANGUAGES: Language[] = [
    { code: 'auto', name: 'Auto Detect' },
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'vi', name: 'Vietnamese' },
];

const TranslatorInterface: React.FC = () => {
    const [sourceLanguage, setSourceLanguage] = useState<string>('auto');
    const [targetLanguage, setTargetLanguage] = useState<string>('en');
    const [sourceText, setSourceText] = useState<string>('');
    const [translatedText, setTranslatedText] = useState<string>('');
    const [isTranslating, setIsTranslating] = useState<boolean>(false);
    const [isConverting, setIsConverting] = useState<boolean>(false);

    const [recorderState, startRecording, stopRecording] = useAudioRecorder();
    const { speak, cancel, isSpeaking } = useSpeechSynthesis();

    // Copy text to clipboard
    const handleCopyText = useCallback((text: string) => {
        if (text.trim()) {
            Clipboard.setString(text);
            Alert.alert('Success', 'Text copied to clipboard!');
        }
    }, []);

    // Clear text from both areas
    const handleClearText = useCallback(() => {
        setSourceText('');
        setTranslatedText('');
    }, []);

    // Swap languages
    const handleSwapLanguages = useCallback(() => {
        if (sourceLanguage === 'auto') {
            Alert.alert('Info', "Can't swap when source language is set to Auto Detect");
            return;
        }
        setSourceLanguage(targetLanguage);
        setTargetLanguage(sourceLanguage);
        setSourceText(translatedText);
        setTranslatedText(sourceText);
    }, [sourceLanguage, targetLanguage, sourceText, translatedText]);

    // Handle translation with debounce
    useEffect(() => {
        if (!sourceText.trim()) {
            setTranslatedText('');
            return;
        }

        const timerId = setTimeout(async () => {
            try {
                setIsTranslating(true);
                const result = await translateText(sourceText, sourceLanguage, targetLanguage);
                setTranslatedText(result.translatedText);
            } catch (error) {
                console.error('Translation error:', error);
                Alert.alert('Error', 'Translation failed. Please try again.');
            } finally {
                setIsTranslating(false);
            }
        }, 500);

        return () => clearTimeout(timerId);
    }, [sourceText, sourceLanguage, targetLanguage]);

    // Handle recording completion
    useEffect(() => {
        const processRecording = async () => {
            if (recorderState.audioBlob && !recorderState.isRecording) {
                try {
                    setIsConverting(true);
                    const text = await convertSpeechToText(recorderState.audioBlob, sourceLanguage);
                    setSourceText(text);
                    // No need to manually translate - the useEffect above will handle it
                } catch (error) {
                    console.error('Speech to text error:', error);
                    Alert.alert('Error', 'Failed to convert speech to text. Please try again.');
                } finally {
                    setIsConverting(false);
                }
            }
        };

        if (recorderState.audioBlob) {
            processRecording();
        }
    }, [recorderState.audioBlob, recorderState.isRecording]);

    return (
        <View style={styles.container}>
            <View style={styles.languageSelectors}>
                <LanguageSelector
                    label="From"
                    selected={sourceLanguage}
                    onChange={setSourceLanguage}
                    languages={LANGUAGES}
                />

                <TouchableOpacity
                    style={styles.swapButton}
                    onPress={handleSwapLanguages}
                >
                    <Text style={styles.swapButtonText}>⇄</Text>
                </TouchableOpacity>

                <LanguageSelector
                    label="To"
                    selected={targetLanguage}
                    onChange={setTargetLanguage}
                    languages={LANGUAGES.filter(lang => lang.code !== 'auto')}
                />
            </View>

            <View style={styles.textAreas}>
                <TextArea
                    label="Original Text"
                    value={sourceText}
                    onChange={setSourceText}
                    placeholder="Enter text to translate or record your voice"
                    onCopyClick={() => handleCopyText(sourceText)}
                />

                <View style={styles.buttonsContainer}>
                    <TouchableOpacity
                        style={[
                            styles.button,
                            recorderState.isRecording ? styles.stopButton : styles.recordButton,
                            isConverting && styles.disabledButton
                        ]}
                        onPress={recorderState.isRecording ? stopRecording : startRecording}
                        disabled={isConverting}
                    >
                        {isConverting ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.buttonText}>
                                {recorderState.isRecording ? 'Stop' : 'Record Voice'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.clearButton,
                        (!sourceText && !translatedText) && styles.disabledButton]}
                        onPress={handleClearText}
                        disabled={!sourceText && !translatedText}
                    >
                        <Text style={styles.buttonText}>Clear</Text>
                    </TouchableOpacity>
                </View>

                <TextArea
                    label="Translation"
                    value={translatedText}
                    onChange={setTranslatedText}
                    editable={false}
                    placeholder="Translation will appear here"
                    onSpeakClick={() => speak(translatedText, targetLanguage)}
                    isSpeaking={isSpeaking}
                    onCopyClick={() => handleCopyText(translatedText)}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    languageSelectors: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
    },
    swapButton: {
        backgroundColor: '#3b82f6', // blue-500
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 10,
        marginTop: 26,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
    },
    swapButtonText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    textAreas: {
        marginTop: 16,
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 15,
    },
    button: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 5,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
    },
    recordButton: {
        backgroundColor: '#ef4444', // red-500
    },
    stopButton: {
        backgroundColor: '#6b7280', // gray-500
    },
    disabledButton: {
        backgroundColor: '#9ca3af', // gray-400
    },
    translateButton: {
        backgroundColor: '#10b981', // emerald-500
    },
    clearButton: {
        backgroundColor: '#6b7280', // gray-500
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default TranslatorInterface;
