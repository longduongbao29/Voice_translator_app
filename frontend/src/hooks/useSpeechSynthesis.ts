import { useState, useRef } from 'react';
import { SpeechSynthesisState } from '../types';

export const useSpeechSynthesis = () => {
  const [state, setState] = useState<SpeechSynthesisState>({
    isSpeaking: false,
    isPaused: false,
  });

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = (text: string, lang: string = 'en-US', rate: number = 1, pitch: number = 1) => {
    if (!('speechSynthesis' in window)) {
      setState(prev => ({
        ...prev,
        error: 'Speech synthesis not supported in this browser',
      }));
      return;
    }

    // Stop any currently speaking utterance
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;

    utterance.onstart = () => {
      setState(prev => ({
        ...prev,
        isSpeaking: true,
        isPaused: false,
        error: undefined,
      }));
    };

    utterance.onend = () => {
      setState(prev => ({
        ...prev,
        isSpeaking: false,
        isPaused: false,
      }));
    };

    utterance.onerror = (event) => {
      setState(prev => ({
        ...prev,
        isSpeaking: false,
        isPaused: false,
        error: event.error,
      }));
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const pause = () => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setState(prev => ({
        ...prev,
        isPaused: true,
      }));
    }
  };

  const resume = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setState(prev => ({
        ...prev,
        isPaused: false,
      }));
    }
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setState(prev => ({
      ...prev,
      isSpeaking: false,
      isPaused: false,
    }));
  };

  const getVoices = () => {
    return window.speechSynthesis.getVoices();
  };

  return {
    ...state,
    speak,
    pause,
    resume,
    stop,
    getVoices,
    isSupported: 'speechSynthesis' in window,
  };
};
