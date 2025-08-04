import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Mic, MicOff, Volume2, VolumeX, Copy, ArrowLeftRight, Loader2, ArrowRight, X } from 'lucide-react';
import { Language, TranslationRequest, TranslationResponse } from '../types/index';
import { translationApi } from '../services/api.ts';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis.ts';
import LanguageSelector from './LanguageSelector.tsx';
import TextArea from './TextArea.tsx';
import AudioStreamer from './AudioStreamer.tsx';

interface TranslatorInterfaceProps {
  languages: Language[];
  isSettingsOpen?: boolean;
  onCloseSettings?: () => void;
}

const TranslatorInterface: React.FC<TranslatorInterfaceProps> = ({
  languages,
  isSettingsOpen = false,
  onCloseSettings
}) => {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [translationEngine, setTranslationEngine] = useState<'google' | 'openai'>('google');
  const [isTranslating, setIsTranslating] = useState(false);
  const [lastTranslation, setLastTranslation] = useState<TranslationResponse | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [sttError, setSttError] = useState<string | undefined>(undefined);
  const [sttStatus, setSttStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [voiceThreshold, setVoiceThreshold] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('voiceThreshold');
      return saved ? parseInt(saved) : 25;
    }
    return 25;
  }); // Voice detection threshold
  const [currentVolume, setCurrentVolume] = useState(0); // Current microphone volume

  const speechSynthesis = useSpeechSynthesis();

  // Convert sourceLanguage to language code for speech recognition
  const getSpeechLanguage = useCallback(() => {
    // If auto-detect, pass 'auto' to backend to let Whisper auto-detect
    if (sourceLanguage === 'auto') {
      return 'auto';
    }
    return sourceLanguage;
  }, [sourceLanguage]);

  // Save voice threshold to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('voiceThreshold', voiceThreshold.toString());
    }
  }, [voiceThreshold]);


  // Memoize handleTranslate to avoid stale closure
  const handleTranslate = useCallback(async () => {
    if (!sourceText.trim()) return;

    setIsTranslating(true);
    try {
      const request: TranslationRequest = {
        text: sourceText,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        engine: translationEngine,
      };
      const response = await translationApi.translate(request);
      if (response.success && response.data) {
        setTranslatedText(response.data.translated_text);
        setLastTranslation(response.data);
        toast.success('Translation completed!');
      }
    } catch (error) {
      toast.error('Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  }, [sourceText, sourceLanguage, targetLanguage, translationEngine]);

  // Auto-translate when source text changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (sourceText.trim() && sourceText !== lastTranslation?.source_text) {
        handleTranslate();
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [sourceText, sourceLanguage, targetLanguage, translationEngine, handleTranslate, lastTranslation?.source_text]);

  const handleSwapLanguages = () => {
    if (sourceLanguage === 'auto') return;

    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const handleClearAll = () => {
    setSourceText('');
    setTranslatedText('');
    setLastTranslation(null);
    setSttError(undefined);
    setSttStatus('disconnected');
    setIsListening(false);
  };

  const handleCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Text copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy text');
    }
  };

  const handleSpeakText = (text: string, language: string) => {
    if (text.trim()) {
      speechSynthesis.speak(text, language);
    }
  };

  const toggleVoiceRecognition = async () => {
    console.log('toggleVoiceRecognition called, current isListening:', isListening);
    if (isListening) {
      // Stop voice recognition
      console.log('Stopping voice recognition...');
      setIsListening(false);
      setSttError(undefined);
      setSttStatus('disconnected');
    } else {
      // Start voice recognition
      console.log('Starting voice recognition...');
      setSttError(undefined);
      try {
        // Test microphone access first
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (stream) {
          stream.getTracks().forEach(track => track.stop()); // Release test stream
        }
        setIsListening(true);
        console.log('Voice recognition started, isListening set to true');
      } catch (err: any) {
        setSttError('Cannot access microphone: ' + (err?.message || err));
        setIsListening(false);
        setSttStatus('error');
        console.error('Failed to start voice recognition:', err);
      }
    }
  };

  // Handle transcription from AudioStreamer
  const handleTranscription = useCallback((text: string) => {
    console.log('Received transcription:', text);
    // Replace text instead of appending since each chunk is independent
    setSourceText(text);
  }, []);

  // Handle errors from AudioStreamer
  const handleSttError = useCallback((error: string) => {
    setSttError(error);
    setIsListening(false);
    setSttStatus('error');
    toast.error(error);
  }, []);

  // Handle status changes from AudioStreamer
  const handleStatusChange = useCallback((status: 'connecting' | 'connected' | 'disconnected' | 'error') => {
    setSttStatus(status);
    if (status === 'connected') {
      toast.success('Voice recognition connected');
    } else if (status === 'error') {
      setIsListening(false);
    }
  }, []);

  // Handle volume changes from AudioStreamer
  const handleVolumeChange = useCallback((volume: number) => {
    setCurrentVolume(volume);
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4">
      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 min-w-[400px] max-w-md relative">
            <button
              className="absolute top-2 right-2 p-1 rounded hover:bg-gray-100"
              onClick={onCloseSettings}
              title="Close"
            >
              <span className="text-xl">×</span>
            </button>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>

            {/* Translation Engine */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Translation Engine</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setTranslationEngine('google')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${translationEngine === 'google'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  Google Translate
                </button>
                <button
                  onClick={() => setTranslationEngine('openai')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${translationEngine === 'openai'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  OpenAI
                </button>
              </div>
            </div>

            {/* Voice Detection Threshold */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Voice Detection Sensitivity</h3>
              <div className="space-y-2">
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={voiceThreshold}
                  onChange={(e) => {
                    const newThreshold = parseInt(e.target.value);
                    setVoiceThreshold(newThreshold);
                    // Show immediate feedback
                    if (isListening) {
                      toast.success(`Voice sensitivity updated to ${newThreshold}`, { duration: 1500 });
                    }
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${((voiceThreshold - 10) / 40) * 100}%, #E5E7EB ${((voiceThreshold - 10) / 40) * 100}%, #E5E7EB 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>High Sensitivity (10)</span>
                  <span className="font-medium text-blue-600">Current: {voiceThreshold}</span>
                  <span>Low Sensitivity (50)</span>
                </div>
                <p className="text-xs text-gray-600">
                  Lower values detect quieter sounds, higher values reduce background noise.
                  {isListening && <span className="text-blue-600 font-medium"> (Applied immediately)</span>}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Language Selection */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center gap-4">
          <div className="flex-1 max-w-sm">
            <LanguageSelector
              languages={languages}
              selectedLanguage={sourceLanguage}
              onLanguageChange={setSourceLanguage}
              label="From"
              includeAuto={true}
            />
          </div>

          <button
            onClick={handleSwapLanguages}
            disabled={sourceLanguage === 'auto'}
            className="p-3 rounded-full bg-blue-100 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            title="Swap languages"
          >
            <ArrowLeftRight className="w-5 h-5 text-blue-600" />
          </button>

          <div className="flex-1 max-w-sm">
            <LanguageSelector
              languages={languages}
              selectedLanguage={targetLanguage}
              onLanguageChange={setTargetLanguage}
              label="To"
              includeAuto={false}
            />
          </div>
        </div>
      </div>

      {/* Translation Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Source Text */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-medium text-gray-900 text-lg">Source Text</h3>
            <div className="flex items-center space-x-3">
              {/* Realtime Voice Input */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleVoiceRecognition}
                  className={`relative p-3 rounded-xl transition-all duration-200 shadow-lg ${isListening
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 scale-105'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 hover:scale-105'
                    }`}
                  title={isListening ? 'Stop realtime recording' : 'Start realtime recording'}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-5 h-5" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
                    </>
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </button>

                <div className="flex flex-col items-center min-w-[80px]">
                  <span className={`text-xs font-medium ${isListening ? 'text-red-600' : 'text-blue-600'}`}>
                    Realtime
                  </span>
                  <span className="text-xs text-gray-500">Voice</span>

                  {/* Volume Display */}
                  {isListening && (
                    <div className="mt-1 flex items-center space-x-1">
                      <span className="text-xs text-gray-400">Vol:</span>
                      <span className={`text-xs font-mono ${currentVolume > voiceThreshold ? 'text-green-600 font-bold' : 'text-gray-500'}`}>
                        {currentVolume}
                      </span>
                      <div className="w-8 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-150 ${currentVolume > voiceThreshold ? 'bg-green-500' : 'bg-gray-400'}`}
                          style={{ width: `${Math.min((currentVolume / 100) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleCopyText(sourceText)}
                disabled={!sourceText}
                className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Copy text"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <TextArea
            value={sourceText}
            onChange={setSourceText}
            placeholder="Enter text to translate or use voice input..."
            className="min-h-40 text-lg"
          />

          {isListening && (
            <>
              <div className="mt-3 flex items-center space-x-2 text-sm">
                <div className={`w-2 h-2 rounded-full animate-pulse ${sttStatus === 'connected' ? 'bg-green-500' :
                  sttStatus === 'connecting' ? 'bg-yellow-500' :
                    sttStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
                  }`}></div>
                <span className={
                  sttStatus === 'connected' ? 'text-green-600' :
                    sttStatus === 'connecting' ? 'text-yellow-600' :
                      sttStatus === 'error' ? 'text-red-600' : 'text-gray-600'
                }>
                  {sttStatus === 'connected' ? 'Recording and transcribing...' :
                    sttStatus === 'connecting' ? 'Connecting...' :
                      sttStatus === 'error' ? 'Connection error' : 'Disconnected'}
                </span>
              </div>
              {/* AudioStreamer component - only render when isListening to auto-connect and start */}
              <AudioStreamer
                isActive={isListening}
                onTranscription={handleTranscription}
                onError={handleSttError}
                onStatusChange={handleStatusChange}
                onVolumeChange={handleVolumeChange}
                voiceThreshold={voiceThreshold}
                language={getSpeechLanguage()}
              />
            </>
          )}
          {sttError && (
            <div className="mt-3 text-sm text-red-600">
              Voice recognition error: {sttError}
            </div>
          )}
        </div>

        {/* Translated Text */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-medium text-gray-900 text-lg">Translation</h3>
            <div className="flex space-x-2">
              {typeof window !== 'undefined' && window.speechSynthesis && (
                <button
                  onClick={() => handleSpeakText(translatedText, targetLanguage)}
                  disabled={!translatedText || window.speechSynthesis.speaking}
                  className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Read aloud"
                >
                  {window.speechSynthesis.speaking ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
              )}
              <button
                onClick={() => handleCopyText(translatedText)}
                disabled={!translatedText}
                className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Copy translation"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="relative">
            <TextArea
              value={translatedText}
              onChange={() => { }} // Read-only
              placeholder="Translation will appear here..."
              className="min-h-40 text-lg"
              readOnly
            />

            {isTranslating && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <div className="flex items-center space-x-2 text-blue-600">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-medium">Translating...</span>
                </div>
              </div>
            )}
          </div>

          {lastTranslation && (
            <div className="mt-3 text-xs text-gray-500">
              Translated using {lastTranslation.translation_engine}
              {lastTranslation.confidence && (
                <span> • Confidence: {Math.round(lastTranslation.confidence * 100)}%</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-6">
        {sourceText.trim() && (
          <button
            onClick={handleTranslate}
            disabled={isTranslating}
            className="group flex items-center space-x-2 px-8 py-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            title="Translate text"
          >
            {isTranslating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            )}
            <span className="font-medium">Translate</span>
          </button>
        )}

        {(sourceText.trim() || translatedText.trim()) && (
          <button
            onClick={handleClearAll}
            className="group flex items-center space-x-2 px-6 py-4 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-all duration-200 shadow-lg hover:shadow-xl"
            title="Clear all text"
          >
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            <span className="font-medium">Clear</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default TranslatorInterface;
