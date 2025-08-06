import axios from 'axios';
import { TranslationResponse } from '../types';

// Base API URL - update this to your backend URL when deployed
// For Android emulator, use 10.0.2.2 instead of localhost to access host machine
// For iOS simulator, use localhost
// For physical device on same network, use your computer's local IP address
const API_URL = 'http://192.168.1.136:8004/api/v1';

// Create axios instance with base config
const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000, // 15 seconds
});

export const translateText = async (
    text: string,
    from: string,
    to: string
): Promise<TranslationResponse> => {
    try {
        const response = await apiClient.post('/translate/translate', {
            text,
            source_language: from,
            target_language: to,
        });

        return {
            translatedText: response.data.translated_text,
            from,
            to,
        };
    } catch (error) {
        console.error('Translation error:', error);
        throw error;
    }
};

export const convertSpeechToText = async (
    audioBlob: Blob,
    language: string
): Promise<string> => {
    try {
        const formData = new FormData();

        // In React Native, we need to use a different approach for files
        if (typeof audioBlob === 'object' && 'uri' in audioBlob) {
            // This is a React Native file object
            formData.append('audio', {
                uri: audioBlob.uri,
                type: 'audio/mp3',
                name: 'audio.mp3',
            } as any);
        } else {
            // Fallback for other blob types
            formData.append('audio', audioBlob as any);
        }

        formData.append('language', language);

        const response = await apiClient.post('/speech2text/transcribe', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data.text;
    } catch (error) {
        console.error('Speech to text error:', error);
        throw error;
    }
};