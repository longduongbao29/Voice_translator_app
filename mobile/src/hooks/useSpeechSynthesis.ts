import { useState, useEffect } from 'react';
import Tts from 'react-native-tts';

const useSpeechSynthesis = () => {
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Initialize TTS
    useEffect(() => {
        // Initialize Text-to-Speech engine
        Tts.setDucking(true); // Duck audio when TTS is playing

        // Set up event listeners
        Tts.addEventListener('tts-start', () => setIsSpeaking(true));
        Tts.addEventListener('tts-finish', () => setIsSpeaking(false));
        Tts.addEventListener('tts-cancel', () => setIsSpeaking(false));
        Tts.addEventListener('tts-error', (err) => {
            console.error('TTS error:', err);
            setIsSpeaking(false);
        });

        // Cleanup
        return () => {
            Tts.removeAllListeners('tts-start');
            Tts.removeAllListeners('tts-finish');
            Tts.removeAllListeners('tts-cancel');
            Tts.removeAllListeners('tts-error');
        };
    }, []);

    const speak = async (text: string, language: string): Promise<void> => {
        try {
            if (isSpeaking) {
                await cancel();
            }

            // Set the language
            await Tts.setDefaultLanguage(language);

            // Speak the text
            await Tts.speak(text);
        } catch (error) {
            console.error('Text-to-speech error:', error);
            setIsSpeaking(false);
        }
    };

    const cancel = async (): Promise<void> => {
        try {
            await Tts.stop();
        } catch (error) {
            console.error('Error stopping TTS:', error);
        }
    };

    return { speak, cancel, isSpeaking };
};

export default useSpeechSynthesis;