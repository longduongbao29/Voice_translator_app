import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Volume2, VolumeX, Copy, ArrowLeftRight, Loader2, X, Star, Download } from 'lucide-react';
import { Language, TranslationRequest, TranslationResponse } from '../types/index';
import { translationApi, userApi, text2speechApi } from '../services/api.ts';
import { useAudioRecorder } from '../hooks/useAudioRecorder.ts';
import { useAuth } from '../context/AuthContext.tsx';
import LanguageSelector from '../components/ui/LanguageSelector.tsx';
import TextArea from '../components/ui/TextArea.tsx';

interface TranslatorInterfaceProps { }

const TranslatorInterface: React.FC<TranslatorInterfaceProps> = () => {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [translationEngine, setTranslationEngine] = useState<string>('google');
  const [isTranslating, setIsTranslating] = useState(false);
  const [lastTranslation, setLastTranslation] = useState<TranslationResponse | null>(null);
  const [sttError, setSttError] = useState<string | undefined>(undefined);
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [isDetectingLanguage, setIsDetectingLanguage] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);

  const audioRecorder = useAudioRecorder();
  const { isAuthenticated, user } = useAuth();

  // Fetch supported languages from backend
  useEffect(() => {
    const loadLanguages = async () => {
      setIsLoadingLanguages(true);
      try {
        const response = await translationApi.getLanguages();
        console.log('🌐 Languages API response:', response);

        if (response.success && response.data) {
          const data: any = response.data;
          console.log('🌐 Raw language data:', data);

          let allLanguages: Language[] = [];

          // Handle different response formats
          if (data.languages && typeof data.languages === 'object') {
            // Convert object to array and capitalize names
            allLanguages = Object.entries(data.languages).map(([code, name]) => ({
              code,
              name: typeof name === 'string' ?
                name.charAt(0).toUpperCase() + name.slice(1) :
                String(name),
              native_name: typeof name === 'string' ?
                name.charAt(0).toUpperCase() + name.slice(1) :
                String(name),
              supports_offline: false
            }));
          } else if (Array.isArray(data)) {
            // If response.data is already an array
            allLanguages = data;
          } else if (Array.isArray(data.languages)) {
            // If response.data.languages is an array
            allLanguages = data.languages;
          }

          // Popular languages that should appear first
          const popularCodes = [
            'vi', 'en', 'zh', 'es', 'fr', 'de', 'ja', 'ko', 'ru', 'ar',
            'hi', 'pt', 'it', 'th', 'nl', 'tr', 'pl', 'sv', 'da', 'no'
          ];

          // Separate popular and other languages
          const popularLanguages = popularCodes
            .map(code => allLanguages.find(lang => lang.code === code))
            .filter(Boolean) as Language[];

          const otherLanguages = allLanguages
            .filter(lang => !popularCodes.includes(lang.code))
            .sort((a, b) => a.name.localeCompare(b.name));

          // Combine with popular languages first
          const finalLanguages = [...popularLanguages, ...otherLanguages];

          console.log('🌐 Final languages:', finalLanguages.slice(0, 5));
          setLanguages(finalLanguages);
        } else {
          console.error('Failed to fetch languages:', response.error);
          // Fallback to default languages if API fails
          setLanguages(getDefaultLanguages());
          toast.error('Using default languages - backend not available');
        }
      } catch (error) {
        console.error('Error fetching languages:', error);
        // Fallback to default languages if API fails
        setLanguages(getDefaultLanguages());
        toast.error('Using default languages - backend not available');
      } finally {
        setIsLoadingLanguages(false);
      }
    };

    loadLanguages();
  }, []);

  // Default languages fallback
  const getDefaultLanguages = (): Language[] => [
    { code: 'en', name: 'English', native_name: 'English', supports_offline: true },
    { code: 'vi', name: 'Vietnamese', native_name: 'Tiếng Việt', supports_offline: true },
    { code: 'zh', name: 'Chinese', native_name: '中文', supports_offline: true },
    { code: 'ja', name: 'Japanese', native_name: '日本語', supports_offline: true },
    { code: 'ko', name: 'Korean', native_name: '한국어', supports_offline: true },
    { code: 'fr', name: 'French', native_name: 'Français', supports_offline: true },
    { code: 'de', name: 'German', native_name: 'Deutsch', supports_offline: true },
    { code: 'es', name: 'Spanish', native_name: 'Español', supports_offline: true },
    { code: 'it', name: 'Italian', native_name: 'Italiano', supports_offline: true },
    { code: 'pt', name: 'Portuguese', native_name: 'Português', supports_offline: true },
    { code: 'ru', name: 'Russian', native_name: 'Русский', supports_offline: true },
    { code: 'ar', name: 'Arabic', native_name: 'العربية', supports_offline: true },
    { code: 'th', name: 'Thai', native_name: 'ไทย', supports_offline: true },
    { code: 'hi', name: 'Hindi', native_name: 'हिन्दी', supports_offline: true }
  ];

  // Load user settings after login
  useEffect(() => {
    const loadUserSettings = async () => {
      if (isAuthenticated && user) {
        try {
          const result = await userApi.getSettings();
          if (result.success && result.data) {
            // Apply user settings
            if (result.data.src_lang) {
              setSourceLanguage(result.data.src_lang);
            }
            if (result.data.trg_lang) {
              setTargetLanguage(result.data.trg_lang);
            }
            if (result.data.translate_api) {
              setTranslationEngine(result.data.translate_api);
            }
            // Note: text2speech_api is loaded but used automatically by the backend service
          }
        } catch (error) {
          console.error('Failed to load user settings:', error);
        }
      }
    };

    loadUserSettings();
  }, [isAuthenticated, user]);

  // Handle recorder errors
  useEffect(() => {
    if (audioRecorder.error) {
      setSttError(audioRecorder.error);
      toast.error(audioRecorder.error);
    }
  }, [audioRecorder.error]);
  // Convert sourceLanguage to language code for speech recognition
  // const getSpeechLanguage = useCallback(() => {
  //   // If auto-detect, pass 'auto' to backend to let Whisper auto-detect
  //   if (sourceLanguage === 'auto') {
  //     return 'auto';
  //   }
  //   return sourceLanguage;
  // }, [sourceLanguage]);

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


  const handleSpeakText = async (text: string, language: string) => {
    if (!text.trim()) {
      toast.error('No text to speak');
      return;
    }

    if (text.length > 5000) {
      toast.error('Text too long (max 5000 characters)');
      return;
    }

    setIsGeneratingAudio(true);
    try {
      // Use the appropriate language for text-to-speech
      let languageCode = language;
      if (language === 'auto' && detectedLanguage) {
        languageCode = detectedLanguage;
      }

      const response = await text2speechApi.synthesizeText(text, languageCode);

      if (response.success && response.data) {
        // Create audio object and play
        const url = window.URL.createObjectURL(response.data);
        const audio = new Audio(url);

        audio.onloadstart = () => {
          setIsGeneratingAudio(false);
          setIsPlayingAudio(true);
        };

        audio.onended = () => {
          window.URL.revokeObjectURL(url);
          setIsPlayingAudio(false);
        };

        audio.onerror = () => {
          window.URL.revokeObjectURL(url);
          setIsGeneratingAudio(false);
          setIsPlayingAudio(false);
          toast.error('Failed to play audio');
        };

        await audio.play();
      } else {
        setIsGeneratingAudio(false);
        toast.error(response.error || 'Failed to generate audio');
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      setIsGeneratingAudio(false);
      toast.error('Failed to generate audio');
    }
  };

  const handleDownloadAudio = async (text: string, language: string, textType: 'source' | 'translated') => {
    if (!text.trim()) {
      toast.error('No text to convert to audio');
      return;
    }

    if (text.length > 5000) {
      toast.error('Text too long (max 5000 characters)');
      return;
    }

    setIsGeneratingAudio(true);
    try {
      // Use the appropriate language for text-to-speech
      let languageCode = language;
      if (textType === 'source' && sourceLanguage === 'auto' && detectedLanguage) {
        languageCode = detectedLanguage;
      }

      const response = await text2speechApi.synthesizeText(text, languageCode);

      if (response.success && response.data) {
        // Create download link
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;

        // Generate filename
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        const langCode = languageCode || 'unknown';
        const prefix = textType === 'source' ? 'source' : 'translated';
        link.download = `${prefix}_${langCode}_${timestamp}.mp3`;

        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up
        window.URL.revokeObjectURL(url);

        toast.success('Audio downloaded successfully');
      } else {
        toast.error(response.error || 'Failed to generate audio');
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      toast.error('Failed to generate audio');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // const toggleVoiceRecognition = async () => {
  //   if (audioRecorder.isRecording) {
  //     // Stop recording and process audio
  //     console.log('Stopping recording and processing audio...');
  //     const audioBlob = await audioRecorder.stopRecording();

  //     if (!audioBlob) {
  //       toast.error('No audio data recorded');
  //       return;
  //     }

  //     console.log('Audio recorded successfully', audioBlob.type, audioBlob.size);

  //     if (audioBlob.size < 1024) {
  //       toast.error('Recording too short, please try again');
  //       return;
  //     }

  //     setIsProcessingAudio(true);
  //     setSttError(undefined);
  //     try {
  //       // Ensure we have the proper MIME type
  //       const properAudioBlob = audioBlob.type.includes('audio/')
  //         ? audioBlob
  //         : new Blob([audioBlob], { type: 'audio/webm' });

  //       const response = await speechToTextApi.transcribeAudio(properAudioBlob, getSpeechLanguage());
  //       if (response.success && response.data) {
  //         setSourceText(response.data.text);
  //         if (response.data.language && sourceLanguage === 'auto') {
  //           setSourceLanguage(response.data.language);
  //         }
  //       } else {
  //         const errorMessage = typeof response.error === 'object'
  //           ? JSON.stringify(response.error)
  //           : (response.error || 'Failed to transcribe audio.');

  //         setSttError(errorMessage);
  //         toast.error(errorMessage);
  //       }
  //     } catch (error: any) {
  //       const errorMessage = 'Error processing audio: ' + (error.message || 'Unknown error');
  //       console.error(errorMessage, error);
  //       setSttError(errorMessage);
  //       toast.error(errorMessage);
  //     } finally {
  //       setIsProcessingAudio(false);
  //     }
  //   } else {
  //     // Start recording
  //     setSttError(undefined);
  //     await audioRecorder.startRecording();
  //     toast.success('Recording started');
  //   }
  // };

  // Show loading state while fetching languages
  if (isLoadingLanguages) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 p-4">
        <div className="bg-white rounded-lg shadow-md p-8 flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-gray-600">Loading supported languages...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4">
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
              isLoading={isLoadingLanguages}
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
              isLoading={isLoadingLanguages}
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
              {/* <button
                onClick={toggleVoiceRecognition}
                className={`p-2.5 rounded-full transition-all duration-200 shadow-sm ${audioRecorder.isRecording
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : sourceLanguage === 'auto'
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                title={
                  audioRecorder.isRecording
                    ? 'Stop recording'
                    : sourceLanguage === 'auto'
                      ? 'Voice input requires selecting a specific language (auto-detect not supported)'
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
              </button> */}
              <button
                onClick={() => handleSpeakText(sourceText, sourceLanguage === 'auto' && detectedLanguage ? detectedLanguage : sourceLanguage)}
                disabled={!sourceText || isGeneratingAudio || isPlayingAudio}
                className="p-2.5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Read source aloud"
              >
                {isGeneratingAudio ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isPlayingAudio ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => handleDownloadAudio(sourceText, sourceLanguage === 'auto' && detectedLanguage ? detectedLanguage : sourceLanguage, 'source')}
                disabled={!sourceText || isGeneratingAudio}
                className="p-2.5 rounded-full bg-green-100 text-green-600 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Download audio"
              >
                {isGeneratingAudio ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
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

          {/* {(audioRecorder.isRecording || isProcessingAudio) && (
            <div className="mt-2 flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${audioRecorder.isRecording ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
              <span className={`${audioRecorder.isRecording ? 'text-red-600' : 'text-yellow-600'}`}>
                {audioRecorder.isRecording ? 'Recording...' : 'Processing...'}
              </span>
            </div>
          )} */}
          {sttError && (
            <div className="mt-2 text-sm text-red-600">
              Error: {typeof sttError === 'object' ? JSON.stringify(sttError) : sttError}
            </div>
          )}

          {/* Warning message removed from here - now only shown in tooltip */}
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

              <button
                onClick={() => handleSpeakText(translatedText, targetLanguage)}
                disabled={!translatedText || isGeneratingAudio || isPlayingAudio}
                className="p-2.5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Read aloud"
              >
                {isGeneratingAudio ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isPlayingAudio ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => handleDownloadAudio(translatedText, targetLanguage, 'translated')}
                disabled={!translatedText || isGeneratingAudio}
                className="p-2.5 rounded-full bg-green-100 text-green-600 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Download audio"
              >
                {isGeneratingAudio ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </button>
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
