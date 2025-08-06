import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Mic, MicOff, Volume2, VolumeX, Copy, ArrowLeftRight, Loader2, X, Star } from 'lucide-react';
import { Language, TranslationRequest, TranslationResponse } from '../types/index';
import { translationApi, speechToTextApi } from '../services/api.ts';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis.ts';
import { useAudioRecorder } from '../hooks/useAudioRecorder.ts';
import { useAuth } from '../context/AuthContext.tsx';
import LanguageSelector from './LanguageSelector.tsx';
import TextArea from './TextArea.tsx';

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
  const [sttError, setSttError] = useState<string | undefined>(undefined);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [isDetectingLanguage, setIsDetectingLanguage] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const speechSynthesis = useSpeechSynthesis();
  const audioRecorder = useAudioRecorder();
  const { isAuthenticated } = useAuth();

  // Handle recorder errors
  useEffect(() => {
    if (audioRecorder.error) {
      setSttError(audioRecorder.error);
      toast.error(audioRecorder.error);
    }
  }, [audioRecorder.error]);
  // Convert sourceLanguage to language code for speech recognition
  const getSpeechLanguage = useCallback(() => {
    // If auto-detect, pass 'auto' to backend to let Whisper auto-detect
    if (sourceLanguage === 'auto') {
      return 'auto';
    }
    return sourceLanguage;
  }, [sourceLanguage]);

  const handleClearText = () => {
    setSourceText('');
    setTranslatedText('');
    setLastTranslation(null);
    setSttError(undefined);
    setIsFavorite(false);
  };
  // Memoize handleTranslate to avoid stale closure
  const handleTranslate = useCallback(async () => {
    if (!sourceText.trim()) return;

    setIsTranslating(true);
    try {
      // If source language is auto, use detected language if available
      let actualSourceLang = sourceLanguage;
      if (sourceLanguage === 'auto') {
        if (detectedLanguage) {
          actualSourceLang = detectedLanguage;
        } else {
          // If no detected language yet, try to detect
          try {
            const response = await translationApi.detectLanguage(sourceText);
            if (response.success && response.data) {
              actualSourceLang = response.data.detected_language;
              setDetectedLanguage(response.data.detected_language);
            }
          } catch (error) {
            console.error('Error detecting language during translation:', error);
          }
        }
      }

      const request: TranslationRequest = {
        text: sourceText,
        source_language: actualSourceLang,
        target_language: targetLanguage,
        engine: translationEngine,
      };
      const response = await translationApi.translate(request);
      if (response.success && response.data) {
        setTranslatedText(response.data.translated_text);
        setLastTranslation(response.data);
        // Nếu có trường is_favorite, cập nhật trạng thái favorite
        if (response.data.is_favorite !== undefined) {
          setIsFavorite(response.data.is_favorite);
        } else {
          setIsFavorite(false);
        }

        // Nếu là nguồn auto thì đặt source_language từ kết quả dịch làm ngôn ngữ đã phát hiện
        if (sourceLanguage === 'auto' && response.data.source_language) {
          setDetectedLanguage(response.data.source_language);
        }
      }
    } catch (error) {
      toast.error('Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  }, [sourceText, sourceLanguage, targetLanguage, translationEngine, detectedLanguage]);

  // Auto-detect language when source text changes and 'auto' is selected
  useEffect(() => {
    if (sourceLanguage === 'auto' && sourceText.trim()) {
      setIsDetectingLanguage(true);

      const detectTimeoutId = setTimeout(async () => {
        try {
          const response = await translationApi.detectLanguage(sourceText);
          if (response.success && response.data) {
            setDetectedLanguage(response.data.detected_language);
          }
        } catch (error) {
          console.error('Error detecting language:', error);
        } finally {
          setIsDetectingLanguage(false);
        }
      }, 300); // Faster than translation timeout

      return () => clearTimeout(detectTimeoutId);
    } else if (!sourceText.trim() || sourceLanguage !== 'auto') {
      setDetectedLanguage('');
    }
  }, [sourceText, sourceLanguage]);

  // Auto-translate when source text or languages change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (sourceText.trim()) {
        handleTranslate();
      }
    }, 500); // Giảm thời gian delay để responsive hơn

    return () => clearTimeout(timeoutId);
  }, [sourceText, sourceLanguage, targetLanguage, translationEngine, handleTranslate]);

  const handleSwapLanguages = () => {
    if (sourceLanguage === 'auto') return;

    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);
    // Reset detected language when swapping
    setDetectedLanguage('');
    // Không cần swap text nữa vì sẽ tự động translate lại
  };

  const toggleFavoriteTranslation = async () => {
    // Kiểm tra xem người dùng đã đăng nhập chưa
    if (!isAuthenticated) {
      toast.error('Please login to save translations');
      return;
    }

    // Kiểm tra xem có bản dịch và ID không
    if (!lastTranslation || !lastTranslation.id) {
      toast.error('No translation to save');
      return;
    }

    try {
      setIsSaving(true);
      const newFavoriteState = !isFavorite;
      const result = await translationApi.toggleFavorite(lastTranslation.id, newFavoriteState);

      if (result.success) {
        setIsFavorite(newFavoriteState);
        toast.success(newFavoriteState
          ? 'Translation saved to favorites'
          : 'Translation removed from favorites'
        );
      } else {
        toast.error(result.error || 'Failed to update favorite status');
      }
    } catch (error) {
      console.error('Error toggling favorite status:', error);
      toast.error('Failed to update favorite status');
    } finally {
      setIsSaving(false);
    }
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
    if (audioRecorder.isRecording) {
      // Stop recording and process audio
      console.log('Stopping recording and processing audio...');
      const audioBlob = await audioRecorder.stopRecording();

      if (!audioBlob) {
        toast.error('No audio data recorded');
        return;
      }

      console.log('Audio recorded successfully', audioBlob.type, audioBlob.size);

      if (audioBlob.size < 1024) {
        toast.error('Recording too short, please try again');
        return;
      }

      setIsProcessingAudio(true);
      setSttError(undefined);
      try {
        // Ensure we have the proper MIME type
        const properAudioBlob = audioBlob.type.includes('audio/')
          ? audioBlob
          : new Blob([audioBlob], { type: 'audio/webm' });

        const response = await speechToTextApi.transcribeAudio(properAudioBlob, getSpeechLanguage());
        if (response.success && response.data) {
          setSourceText(response.data.text);
          if (response.data.language && sourceLanguage === 'auto') {
            setSourceLanguage(response.data.language);
          }
        } else {
          const errorMessage = typeof response.error === 'object'
            ? JSON.stringify(response.error)
            : (response.error || 'Failed to transcribe audio.');

          setSttError(errorMessage);
          toast.error(errorMessage);
        }
      } catch (error: any) {
        const errorMessage = 'Error processing audio: ' + (error.message || 'Unknown error');
        console.error(errorMessage, error);
        setSttError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsProcessingAudio(false);
      }
    } else {
      // Start recording
      setSttError(undefined);
      await audioRecorder.startRecording();
      toast.success('Recording started');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4">
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
          </div>
        </div>
      )}
      {/* Language Selection */}

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-center gap-3">
          <div className="flex-1 max-w-xs">

            <LanguageSelector
              languages={languages}
              selectedLanguage={sourceLanguage}
              onLanguageChange={setSourceLanguage}
              label="From"
              includeAuto={true}
              detectedLanguage={detectedLanguage}
              isDetecting={isDetectingLanguage}
            />
          </div>

          <button
            onClick={handleSwapLanguages}
            disabled={sourceLanguage === 'auto'}
            className="p-2 rounded-full bg-blue-100 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"

            title="Swap languages"
          >
            <ArrowLeftRight className="w-5 h-5 text-blue-600" />
          </button>
          <div className="flex-1 max-w-xs">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Text */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Source Text</h3>
            <div className="flex items-center space-x-2">
              {/* Voice Input Button */}
              <button
                onClick={toggleVoiceRecognition}
                className={`p-2.5 rounded-full transition-all duration-200 shadow-sm ${audioRecorder.isRecording
                  ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                  : sourceLanguage === 'auto'
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                title={
                  audioRecorder.isRecording
                    ? 'Stop recording'
                    : sourceLanguage === 'auto'
                      ? 'Voice input not available with auto-detect language'
                      : 'Start recording'
                }
                disabled={isProcessingAudio || sourceLanguage === 'auto'}
              >
                {isProcessingAudio ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : audioRecorder.isRecording ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => handleCopyText(sourceText)}
                disabled={!sourceText}
                className="p-2.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"

                title="Copy text"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="relative">
            <TextArea
              value={sourceText}
              onChange={setSourceText}
              placeholder="Enter text to translate or use voice input..."
              className="min-h-36"
            />

            {sourceText.trim() && (
              <button
                onClick={handleClearText}
                className="absolute top-3 right-3 p-1 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-500 hover:text-gray-700 transition-colors"
                title="Clear text"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {(audioRecorder.isRecording || isProcessingAudio) && (
            <div className="mt-2 flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${audioRecorder.isRecording ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`}></div>
              <span className={`${audioRecorder.isRecording ? 'text-red-600' : 'text-yellow-600'}`}>
                {audioRecorder.isRecording ? 'Recording...' : 'Processing...'}
              </span>
            </div>
          )}
          {sttError && (
            <div className="mt-2 text-sm text-red-600">
              Error: {typeof sttError === 'object' ? JSON.stringify(sttError) : sttError}
            </div>
          )}

          {sourceLanguage === 'auto' && !audioRecorder.isRecording && !isProcessingAudio && (
            <div className="mt-2 text-sm text-amber-600 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              Voice input requires selecting a specific language (auto-detect not supported).
            </div>
          )}
        </div>

        {/* Translated Text */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Translation</h3>
            <div className="flex space-x-2">
              {/* Favorite star button */}
              {lastTranslation && lastTranslation.id && (
                <button
                  onClick={toggleFavoriteTranslation}
                  disabled={!isAuthenticated || isSaving || !translatedText}
                  className={`p-2.5 rounded-full ${!isAuthenticated
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : isFavorite
                        ? 'bg-yellow-100 text-yellow-500 hover:bg-yellow-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    } transition-colors`}
                  title={!isAuthenticated ? 'Login to save translations' : isFavorite ? 'Remove from favorites' : 'Save translation'}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Star className={`w-4 h-4 ${isFavorite ? 'fill-yellow-500' : ''}`} />
                  )}
                </button>
              )}

              {typeof window !== 'undefined' && window.speechSynthesis && (
                <button
                  onClick={() => handleSpeakText(translatedText, targetLanguage)}
                  disabled={!translatedText || window.speechSynthesis.speaking}
                  className="p-2.5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                className="p-2.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              className="min-h-36"

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
            <div className="mt-2 text-xs text-gray-500">

              Translated using {lastTranslation.translation_engine}
              {lastTranslation.confidence && (
                <span> • Confidence: {Math.round(lastTranslation.confidence * 100)}%</span>
              )}
              {!isAuthenticated && translatedText && (
                <div className="mt-1 text-xs text-blue-600">
                  Login to save your translations
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TranslatorInterface;
