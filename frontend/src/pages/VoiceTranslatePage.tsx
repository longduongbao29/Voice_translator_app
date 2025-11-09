import React, { useState, useEffect, useRef } from 'react';
import { speechToTextApi, text2speechApi } from '../services/api.ts';
import { Mic, Volume2, Download, Copy, Play, Pause } from 'lucide-react';
import { useAudioRecorder } from '../hooks/useAudioRecorder.ts';
import LanguageSelector from '../components/ui/LanguageSelector.tsx';
import { translationApi } from '../services/api.ts';
import { Language } from '../types/index.ts';
// No micro animation effects required per request

interface VoiceTranslatePageProps { }

const VoiceTranslatePage: React.FC<VoiceTranslatePageProps> = () => {
    const { isRecording, startRecording, stopRecording, error, level } = useAudioRecorder();
    // Realtime (microphone) results
    const [liveOriginalText, setLiveOriginalText] = useState<string>('');
    const [liveTranslatedText, setLiveTranslatedText] = useState<string>('');

    // File upload results
    const [uploadOriginalText, setUploadOriginalText] = useState<string>('');
    const [uploadTranslatedText, setUploadTranslatedText] = useState<string>('');
    const [fileUploading, setFileUploading] = useState<boolean>(false);
    const [micProcessing, setMicProcessing] = useState<boolean>(false);
    const [uploadedAudioFile, setUploadedAudioFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);

    // Languages for translations (both realtime and upload)
    const [sourceLang, setSourceLang] = useState<string>('auto');
    const [targetLang, setTargetLang] = useState<string>('vi');
    const [languages, setLanguages] = useState<Language[]>([]);
    const [isLoadingLanguages, setIsLoadingLanguages] = useState<boolean>(true);
    const [detectedSourceLang, setDetectedSourceLang] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'realtime' | 'upload'>('realtime');

    // Reset detected language when source language changes
    useEffect(() => {
        if (sourceLang !== 'auto') {
            setDetectedSourceLang('');
        }
    }, [sourceLang]);

    // Audio playback states
    const [isPlayingOriginal, setIsPlayingOriginal] = useState<boolean>(false);
    const [isPlayingTranslation, setIsPlayingTranslation] = useState<boolean>(false);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false);

    // Audio progress states
    const [originalAudioDuration, setOriginalAudioDuration] = useState<number>(0);
    const [originalAudioCurrentTime, setOriginalAudioCurrentTime] = useState<number>(0);
    const [translationAudioDuration, setTranslationAudioDuration] = useState<number>(0);
    const [translationAudioCurrentTime, setTranslationAudioCurrentTime] = useState<number>(0);

    // Audio refs
    const originalAudioRef = useRef<HTMLAudioElement | null>(null);
    const translationAudioRef = useRef<HTMLAudioElement | null>(null);
    const recordedAudioBlobRef = useRef<Blob | null>(null);

    useEffect(() => {
        let mounted = true;
        setIsLoadingLanguages(true);
        (async () => {
            try {
                const res = await translationApi.getLanguages();
                console.log('🌐 Languages API response:', res);

                if (res.success && res.data && mounted) {
                    const d: any = res.data;
                    console.log('🌐 Raw language data:', d);

                    let allLanguages: Language[] = [];

                    if (d.languages && typeof d.languages === 'object') {
                        // Convert object to array and capitalize names
                        allLanguages = Object.entries(d.languages).map(([code, name]) => ({
                            code,
                            name: typeof name === 'string' ?
                                name.charAt(0).toUpperCase() + name.slice(1) :
                                String(name),
                            native_name: typeof name === 'string' ?
                                name.charAt(0).toUpperCase() + name.slice(1) :
                                String(name),
                            supports_offline: false
                        }));
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
                }
            } catch (err) {
                console.error('Failed to load languages', err);
                // Fallback to basic languages
                setLanguages([
                    { code: 'vi', name: 'Vietnamese', native_name: 'Tiếng Việt', supports_offline: false },
                    { code: 'en', name: 'English', native_name: 'English', supports_offline: false },
                    { code: 'zh', name: 'Chinese', native_name: '中文', supports_offline: false },
                    { code: 'ja', name: 'Japanese', native_name: '日本語', supports_offline: false },
                    { code: 'ko', name: 'Korean', native_name: '한국어', supports_offline: false }
                ]);
            } finally {
                if (mounted) {
                    setIsLoadingLanguages(false);
                }
            }
        })();
        return () => { mounted = false };
    }, []);


    useEffect(() => {
        if (error) {
            console.error('Recording error:', error);
        }
    }, [error]);

    const toggleRecording = async () => {
        if (isRecording) {
            const audioBlob = await stopRecording();
            if (audioBlob) {
                // Store the recorded audio blob for playback
                recordedAudioBlobRef.current = audioBlob;

                // Here you would send the audio to your backend for processing
                console.log('🎤 Mic recording stopped, blob size:', audioBlob.size);
                console.log('🎤 Blob type:', audioBlob.type);
                // Send audio blob to backend as realtime use-case
                setMicProcessing(true);
                try {
                    console.log('🎤 Calling speechToTextApi.transcribeAudio for mic...');
                    // API handles speech recognition (auto-detect) and translation to targetLang
                    const resp = await speechToTextApi.transcribeAudio(audioBlob, targetLang);

                    console.log('🎤 Mic API Response:', {
                        success: resp.success,
                        hasData: !!resp.data,
                        error: resp.error,
                        fullResponse: resp
                    });

                    if (resp.success && resp.data) {
                        // API response structure debug for mic
                        console.log('🎤 Mic response data keys:', Object.keys(resp.data));
                        console.log('🎤 Mic response data values:', resp.data);

                        const originalText = resp.data.source_text || resp.data.text || '';
                        const translatedText = resp.data.translated_text || resp.data.translated || '';
                        const detectedLang = resp.data.detected_language || resp.data.source_language || '';

                        console.log('🎤 Mic setting text results:', {
                            originalText: originalText.substring(0, 100) + (originalText.length > 100 ? '...' : ''),
                            translatedText: translatedText.substring(0, 100) + (translatedText.length > 100 ? '...' : ''),
                            detectedLang,
                            originalLength: originalText.length,
                            translatedLength: translatedText.length,
                            sourceTextKey: resp.data.source_text ? 'source_text' : resp.data.text ? 'text' : 'none',
                            translatedKey: resp.data.translated_text ? 'translated_text' : resp.data.translated ? 'translated' : 'none'
                        });

                        setLiveOriginalText(originalText);
                        setLiveTranslatedText(translatedText);
                        if (detectedLang) {
                            setDetectedSourceLang(detectedLang);
                        }
                    } else {
                        console.error('🎤 Mic API Error:', resp.error);
                        setLiveOriginalText('Error: ' + (resp.error || 'Unknown error'));
                        setLiveTranslatedText('');
                    }
                } catch (e) {
                    console.error('🎤 Mic upload failed', e);
                    setLiveOriginalText('Error: Failed to process recording');
                    setLiveTranslatedText('');
                } finally {
                    setMicProcessing(false);
                }
            }
        } else {
            setLiveOriginalText('');
            setLiveTranslatedText('');
            // Clear previous audio references
            recordedAudioBlobRef.current = null;
            await startRecording();
        }
    };

    // Copy text to clipboard
    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (error) {
            console.error('Failed to copy text:', error);
        }
    };

    // Format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Handle file upload processing
    const handleFileUpload = async (file: File) => {
        if (!file) return;

        console.log('📁 Starting file upload process...');
        console.log('File details:', {
            name: file.name,
            size: formatFileSize(file.size),
            type: file.type,
            lastModified: new Date(file.lastModified).toISOString()
        });

        // Reset previous results
        setUploadOriginalText('');
        setUploadTranslatedText('');

        // Store the uploaded file for playback
        setUploadedAudioFile(file);

        setFileUploading(true);
        try {
            console.log('🚀 Calling speechToTextApi.transcribeAudio with:', {
                fileName: file.name,
                targetLang,
                fileSize: file.size
            });

            // API handles speech recognition (auto-detect) and translation to targetLang
            const resp = await speechToTextApi.transcribeAudio(file, targetLang);

            console.log('📡 API Response received:', {
                success: resp.success,
                hasData: !!resp.data,
                error: resp.error,
                fullResponse: resp
            });

            if (resp.success && resp.data) {
                // API response structure debug
                console.log('🔍 Response data keys:', Object.keys(resp.data));
                console.log('🔍 Response data values:', resp.data);

                const originalText = resp.data.source_text || resp.data.text || '';
                const translatedText = resp.data.translated_text || resp.data.translated || '';
                const detectedLang = resp.data.detected_language || resp.data.source_language || '';

                console.log('✅ Setting text results:', {
                    originalText: originalText.substring(0, 100) + (originalText.length > 100 ? '...' : ''),
                    translatedText: translatedText.substring(0, 100) + (translatedText.length > 100 ? '...' : ''),
                    detectedLang,
                    originalLength: originalText.length,
                    translatedLength: translatedText.length,
                    sourceTextKey: resp.data.source_text ? 'source_text' : resp.data.text ? 'text' : 'none',
                    translatedKey: resp.data.translated_text ? 'translated_text' : resp.data.translated ? 'translated' : 'none'
                });

                setUploadOriginalText(originalText);
                setUploadTranslatedText(translatedText);
                if (detectedLang) {
                    setDetectedSourceLang(detectedLang);
                }

                // Force re-render to ensure state update
                setTimeout(() => {
                    console.log('📊 State after update:', {
                        uploadOriginalText: originalText,
                        uploadTranslatedText: translatedText
                    });
                }, 100);
            } else {
                const errorMsg = 'Error: ' + (resp.error || 'Unknown error occurred');
                console.error('❌ API Error:', errorMsg);
                setUploadOriginalText(errorMsg);
                setUploadTranslatedText('');
            }
        } catch (err) {
            console.error('💥 Upload exception:', err);
            const errorMsg = 'Error: Failed to process file - ' + (err instanceof Error ? err.message : 'Unknown error');
            setUploadOriginalText(errorMsg);
            setUploadTranslatedText('');
        } finally {
            setFileUploading(false);
            console.log('🏁 File upload process completed');
        }
    };

    // Reset upload state completely
    const resetUploadState = () => {
        console.log('🔄 Resetting upload state to initial...');

        // Stop any playing audio
        if (originalAudioRef.current) {
            originalAudioRef.current.pause();
            originalAudioRef.current = null;
        }
        if (translationAudioRef.current) {
            translationAudioRef.current.pause();
            translationAudioRef.current = null;
        }

        // Reset all states
        setUploadedAudioFile(null);
        setUploadOriginalText('');
        setUploadTranslatedText('');
        setFileUploading(false);
        setMicProcessing(false);
        setIsPlayingOriginal(false);
        setIsPlayingTranslation(false);
        setOriginalAudioDuration(0);
        setOriginalAudioCurrentTime(0);
        setTranslationAudioDuration(0);
        setTranslationAudioCurrentTime(0);

        // Reset file input
        const input = document.getElementById('audioFileInput') as HTMLInputElement;
        if (input) {
            input.value = '';
        }

        console.log('✅ Upload state reset complete');
    };

    // Handle drag events
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            // Check if it's an audio file
            if (file.type.startsWith('audio/')) {
                handleFileUpload(file);
            } else {
                alert('Please select an audio file (MP3, WAV, M4A, etc.)');
            }
        }
    };

    // Play original recorded audio or uploaded file
    const toggleOriginalAudio = async () => {
        try {
            if (isPlayingOriginal && originalAudioRef.current) {
                originalAudioRef.current.pause();
                setIsPlayingOriginal(false);
                return;
            }

            let audioUrl: string;

            if (activeTab === 'realtime' && recordedAudioBlobRef.current) {
                audioUrl = URL.createObjectURL(recordedAudioBlobRef.current);
            } else if (activeTab === 'upload' && uploadedAudioFile) {
                audioUrl = URL.createObjectURL(uploadedAudioFile);
            } else {
                return;
            }

            if (originalAudioRef.current) {
                originalAudioRef.current.pause();
                originalAudioRef.current.removeEventListener('loadedmetadata', () => { });
                originalAudioRef.current.removeEventListener('timeupdate', () => { });
                originalAudioRef.current.removeEventListener('ended', () => { });
            }

            const audio = new Audio(audioUrl);
            originalAudioRef.current = audio;

            audio.addEventListener('loadedmetadata', () => {
                setOriginalAudioDuration(audio.duration);
            });

            audio.addEventListener('timeupdate', () => {
                setOriginalAudioCurrentTime(audio.currentTime);
            });

            audio.addEventListener('ended', () => {
                setIsPlayingOriginal(false);
                setOriginalAudioCurrentTime(0);
                URL.revokeObjectURL(audioUrl);
            });

            setIsPlayingOriginal(true);
            await audio.play();
        } catch (error) {
            console.error('Error playing original audio:', error);
            setIsPlayingOriginal(false);
        }
    };

    // Seek original audio
    const seekOriginalAudio = (time: number) => {
        if (originalAudioRef.current) {
            originalAudioRef.current.currentTime = time;
            setOriginalAudioCurrentTime(time);
        }
    };

    // Generate and play translation audio using TTS
    const toggleTranslationAudio = async () => {
        const textToSpeak = activeTab === 'realtime' ? liveTranslatedText : uploadTranslatedText;

        if (!textToSpeak.trim()) return;

        try {
            if (isPlayingTranslation && translationAudioRef.current) {
                translationAudioRef.current.pause();
                setIsPlayingTranslation(false);
                return;
            }

            setIsGeneratingAudio(true);

            // Call TTS API
            const response = await text2speechApi.synthesizeText(textToSpeak, targetLang);

            if (response.success && response.data) {
                const audioUrl = URL.createObjectURL(response.data);

                if (translationAudioRef.current) {
                    translationAudioRef.current.pause();
                    translationAudioRef.current.removeEventListener('loadedmetadata', () => { });
                    translationAudioRef.current.removeEventListener('timeupdate', () => { });
                    translationAudioRef.current.removeEventListener('ended', () => { });
                }

                const audio = new Audio(audioUrl);
                translationAudioRef.current = audio;

                audio.addEventListener('loadedmetadata', () => {
                    setTranslationAudioDuration(audio.duration);
                });

                audio.addEventListener('timeupdate', () => {
                    setTranslationAudioCurrentTime(audio.currentTime);
                });

                audio.addEventListener('ended', () => {
                    setIsPlayingTranslation(false);
                    setTranslationAudioCurrentTime(0);
                    URL.revokeObjectURL(audioUrl);
                });

                setIsPlayingTranslation(true);
                await audio.play();
            } else {
                console.error('TTS failed:', response.error);
                setIsPlayingTranslation(false);
            }
        } catch (error) {
            console.error('Error generating/playing translation audio:', error);
            setIsPlayingTranslation(false);
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    // Seek translation audio
    const seekTranslationAudio = (time: number) => {
        if (translationAudioRef.current) {
            translationAudioRef.current.currentTime = time;
            setTranslationAudioCurrentTime(time);
        }
    };

    // Download translation audio
    const downloadTranslationAudio = async () => {
        const textToSpeak = activeTab === 'realtime' ? liveTranslatedText : uploadTranslatedText;

        if (!textToSpeak.trim()) return;

        try {
            setIsGeneratingAudio(true);

            // Call TTS API
            const response = await text2speechApi.synthesizeText(textToSpeak, targetLang);

            if (response.success && response.data) {
                // Create download link
                const audioUrl = URL.createObjectURL(response.data);
                const link = document.createElement('a');
                link.href = audioUrl;
                link.download = `translation_${Date.now()}.mp3`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(audioUrl);
            } else {
                console.error('TTS failed:', response.error);
            }
        } catch (error) {
            console.error('Error downloading translation audio:', error);
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    return (
        <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-4 px-4 overflow-hidden">
            <div className="w-full max-w-4xl mx-auto h-full flex flex-col">
                {/* Compact Header */}
                <header className="text-center mb-4">
                    <h1 className="text-2xl font-bold text-gray-800 mb-1">Voice & File Translation</h1>
                    <p className="text-sm text-gray-600">Translate speech and audio files with ease</p>
                </header>

                {/* Compact Navigation Bar */}
                <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-3">
                    <div className="flex items-center justify-between p-3">
                        {/* Tab Navigation */}
                        <div className="flex space-x-1 bg-gray-100 rounded-md p-1">
                            <button
                                onClick={() => setActiveTab('realtime')}
                                className={`flex items-center px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${activeTab === 'realtime'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-blue-600'
                                    }`}
                            >
                                <Mic className="w-4 h-4 mr-1" />
                                Mic
                            </button>
                            <button
                                onClick={() => setActiveTab('upload')}
                                className={`flex items-center px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${activeTab === 'upload'
                                    ? 'bg-white text-green-600 shadow-sm'
                                    : 'text-gray-600 hover:text-green-600'
                                    }`}
                            >
                                <Download className="w-4 h-4 mr-1" />
                                Upload
                            </button>
                        </div>

                        {/* Language Selectors */}
                        <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-600 font-medium">From:</span>
                                <div className="min-w-[100px]">
                                    <LanguageSelector
                                        languages={languages}
                                        selectedLanguage={sourceLang}
                                        onLanguageChange={setSourceLang}
                                        label=""
                                        includeAuto={true}
                                        isLoading={isLoadingLanguages}
                                        detectedLanguage={detectedSourceLang}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-600 font-medium">To:</span>
                                <div className="min-w-[100px]">
                                    <LanguageSelector
                                        languages={languages}
                                        selectedLanguage={targetLang}
                                        onLanguageChange={setTargetLang}
                                        label=""
                                        includeAuto={false}
                                        isLoading={isLoadingLanguages}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Area - Fit Content */}
                <div className="flex flex-col">
                    {/* Realtime microphone section */}
                    {activeTab === 'realtime' && (
                        <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <div className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                                    Live Recording
                                </div>
                                {/* Microphone Button - Compact */}
                                <div className="relative">
                                    <div
                                        aria-hidden
                                        style={{
                                            transform: `scale(${0.8 + level * 0.4})`,
                                            opacity: Math.max(0.2, Math.min(0.6, 0.2 + level * 0.4)),
                                            transition: 'transform 120ms linear, opacity 120ms linear'
                                        }}
                                        className="absolute rounded-full bg-gradient-to-r from-blue-200 to-blue-300 w-16 h-16 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                                    />
                                    <button
                                        onClick={toggleRecording}
                                        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                                        className={`relative z-10 rounded-full p-3 transition-all duration-300 flex items-center justify-center transform hover:scale-110 ${isRecording
                                            ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-lg animate-pulse'
                                            : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg'
                                            }`}
                                    >
                                        <Mic className="w-6 h-6 text-white" />
                                    </button>
                                </div>
                            </div>
                            {/* Results Grid - Fit Content */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Original Text */}
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-xs font-semibold text-blue-800 flex items-center">
                                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                                            Original
                                        </h3>
                                        {!isRecording && liveOriginalText && (
                                            <button
                                                onClick={() => copyToClipboard(liveOriginalText)}
                                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 active:scale-95 transition-all duration-200 shadow-sm font-medium"
                                                title="Copy text"
                                            >
                                                <Copy className="w-3 h-3" />
                                                Copy
                                            </button>
                                        )}
                                    </div>
                                    <div className="bg-white rounded p-2 border border-blue-200 min-h-[120px] flex flex-col">
                                        <p className="text-xs text-gray-800 leading-relaxed flex-1">
                                            {isRecording ? (
                                                <span className="text-blue-600 italic">Listening...</span>
                                            ) : micProcessing ? (
                                                <span className="text-blue-600 italic">Processing...</span>
                                            ) : (
                                                liveOriginalText || <span className="text-gray-400">No transcription yet</span>
                                            )}
                                        </p>
                                        {!isRecording && liveOriginalText && recordedAudioBlobRef.current && (
                                            <div className="mt-2 pt-2 border-t border-blue-100">
                                                <div className="flex items-center gap-2 text-xs">
                                                    <button
                                                        onClick={toggleOriginalAudio}
                                                        className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all duration-200"
                                                    >
                                                        {isPlayingOriginal ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                                    </button>
                                                    <span className="text-xs text-gray-500 min-w-[24px]">
                                                        {Math.floor(originalAudioCurrentTime)}s
                                                    </span>
                                                    <div className="flex-1 relative">
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max={originalAudioDuration || 100}
                                                            value={originalAudioCurrentTime}
                                                            onChange={(e) => seekOriginalAudio(parseFloat(e.target.value))}
                                                            className="w-full h-1 bg-blue-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                                                            style={{
                                                                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(originalAudioCurrentTime / (originalAudioDuration || 100)) * 100}%, #cbd5e1 ${(originalAudioCurrentTime / (originalAudioDuration || 100)) * 100}%, #cbd5e1 100%)`
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-gray-500 min-w-[24px]">
                                                        {Math.floor(originalAudioDuration)}s
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Translation */}
                                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-xs font-semibold text-green-800 flex items-center">
                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></div>
                                            Translation
                                        </h3>
                                        {!isRecording && liveTranslatedText && (
                                            <button
                                                onClick={() => copyToClipboard(liveTranslatedText)}
                                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-green-500 text-white rounded-md hover:bg-green-600 active:scale-95 transition-all duration-200 shadow-sm font-medium"
                                                title="Copy text"
                                            >
                                                <Copy className="w-3 h-3" />
                                                Copy
                                            </button>
                                        )}
                                    </div>
                                    <div className="bg-white rounded p-2 border border-green-200 min-h-[120px] flex flex-col">
                                        <p className="text-xs text-gray-800 leading-relaxed flex-1">
                                            {isRecording ? (
                                                <span className="text-green-600 italic">Translating...</span>
                                            ) : micProcessing ? (
                                                <span className="text-green-600 italic">Processing translation...</span>
                                            ) : (
                                                liveTranslatedText || <span className="text-gray-400">No translation yet</span>
                                            )}
                                        </p>
                                        {!isRecording && liveTranslatedText && (
                                            <div className="mt-2 pt-2 border-t border-green-100">
                                                <div className="flex items-center gap-2 text-xs">
                                                    <button
                                                        onClick={toggleTranslationAudio}
                                                        disabled={isGeneratingAudio}
                                                        className="flex items-center justify-center w-6 h-6 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:opacity-50 transition-all duration-200"
                                                    >
                                                        {isGeneratingAudio ? <Volume2 className="w-3 h-3 animate-pulse" /> :
                                                            isPlayingTranslation ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                                    </button>
                                                    <span className="text-xs text-gray-500 min-w-[24px]">
                                                        {Math.floor(translationAudioCurrentTime)}s
                                                    </span>
                                                    <div className="flex-1 relative">
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max={translationAudioDuration || 100}
                                                            value={translationAudioCurrentTime}
                                                            onChange={(e) => seekTranslationAudio(parseFloat(e.target.value))}
                                                            className="w-full h-1 bg-green-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                                                            style={{
                                                                background: `linear-gradient(to right, #10b981 0%, #10b981 ${(translationAudioCurrentTime / (translationAudioDuration || 100)) * 100}%, #cbd5e1 ${(translationAudioCurrentTime / (translationAudioDuration || 100)) * 100}%, #cbd5e1 100%)`
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-gray-500 min-w-[24px]">
                                                        {Math.floor(translationAudioDuration)}s
                                                    </span>
                                                    <button
                                                        onClick={downloadTranslationAudio}
                                                        disabled={isGeneratingAudio}
                                                        className="flex items-center justify-center w-6 h-6 bg-gray-500 text-white rounded-full hover:bg-gray-600 disabled:opacity-50 transition-all duration-200"
                                                        title="Download audio"
                                                    >
                                                        <Download className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* File upload section */}
                    {activeTab === 'upload' && (
                        <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                    File Upload
                                </div>
                            </div>

                            {/* File Upload Area - Enhanced with Drag & Drop */}
                            <div className="mb-4">
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="audio/*"
                                        onChange={async (e) => {
                                            const file = e.target.files && e.target.files[0];
                                            if (file) {
                                                await handleFileUpload(file);
                                            }
                                        }}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        id="audioFileInput"
                                    />
                                    <div
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        className={`flex flex-col items-center justify-center w-full min-h-[80px] border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300 ${isDragging
                                            ? 'border-blue-500 bg-blue-50'
                                            : uploadedAudioFile
                                                ? 'border-green-400 bg-green-50'
                                                : 'border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 hover:border-blue-400'
                                            }`}
                                    >
                                        {uploadedAudioFile ? (
                                            // Show file info when file is selected
                                            <div className="flex items-center p-3 w-full">
                                                <div className="flex items-center flex-1">
                                                    <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full mr-3">
                                                        <Volume2 className="w-5 h-5 text-green-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 truncate">
                                                            {uploadedAudioFile.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {formatFileSize(uploadedAudioFile.size)} • Audio file
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        resetUploadState();
                                                    }}
                                                    className="flex items-center justify-center w-6 h-6 bg-gray-200 text-gray-600 rounded-full hover:bg-red-200 hover:text-red-600 transition-colors duration-200 ml-2 z-20"
                                                    title="Remove file"
                                                    type="button"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ) : (
                                            // Show upload prompt when no file
                                            <label htmlFor="audioFileInput" className="flex flex-col items-center p-4 cursor-pointer">
                                                <Download className={`w-8 h-8 mb-2 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                                                <div className="text-center">
                                                    <p className={`text-sm ${isDragging ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                                                        {isDragging ? (
                                                            <span>Drop your audio file here</span>
                                                        ) : (
                                                            <>
                                                                <span className="font-semibold">Click to upload</span> or drag and drop
                                                            </>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">MP3, WAV, M4A, FLAC, AAC</p>
                                                </div>
                                            </label>
                                        )}
                                    </div>
                                </div>

                                {fileUploading && (
                                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-blue-800">Processing audio file...</p>
                                                <p className="text-xs text-blue-600">Transcribing and translating your audio</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Results Grid - Fit Content */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Original Text */}
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-xs font-semibold text-blue-800 flex items-center">
                                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                                            Original
                                        </h3>
                                        {uploadOriginalText && uploadOriginalText.length > 0 && !fileUploading && (
                                            <button
                                                onClick={() => copyToClipboard(uploadOriginalText)}
                                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 active:scale-95 transition-all duration-200 shadow-sm font-medium"
                                                title="Copy text"
                                            >
                                                <Copy className="w-3 h-3" />
                                                Copy
                                            </button>
                                        )}
                                    </div>
                                    <div className="bg-white rounded p-2 border border-blue-200 min-h-[120px] flex flex-col">
                                        <p className="text-xs text-gray-800 leading-relaxed flex-1">
                                            {uploadOriginalText ? (
                                                uploadOriginalText
                                            ) : fileUploading ? (
                                                <span className="text-blue-600 italic">Processing...</span>
                                            ) : (
                                                <span className="text-gray-400">No transcription yet</span>
                                            )}
                                        </p>
                                        {uploadOriginalText && uploadOriginalText.length > 0 && uploadedAudioFile && !fileUploading && (
                                            <div className="mt-2 pt-2 border-t border-blue-100">
                                                <div className="flex items-center gap-2 text-xs">
                                                    <button
                                                        onClick={toggleOriginalAudio}
                                                        disabled={isPlayingOriginal}
                                                        className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 transition-all duration-200"
                                                    >
                                                        {isPlayingOriginal ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                                    </button>
                                                    <span className="text-xs text-gray-500 min-w-[24px]">
                                                        {Math.floor(originalAudioCurrentTime)}s
                                                    </span>
                                                    <div className="flex-1 relative">
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max={originalAudioDuration || 100}
                                                            value={originalAudioCurrentTime}
                                                            onChange={(e) => seekOriginalAudio(parseFloat(e.target.value))}
                                                            className="w-full h-1 bg-blue-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                                                            style={{
                                                                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(originalAudioCurrentTime / (originalAudioDuration || 100)) * 100}%, #cbd5e1 ${(originalAudioCurrentTime / (originalAudioDuration || 100)) * 100}%, #cbd5e1 100%)`
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-gray-500 min-w-[24px]">
                                                        {Math.floor(originalAudioDuration)}s
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Translation */}
                                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-xs font-semibold text-green-800 flex items-center">
                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></div>
                                            Translation
                                        </h3>
                                        {uploadTranslatedText && uploadTranslatedText.length > 0 && !fileUploading && (
                                            <button
                                                onClick={() => copyToClipboard(uploadTranslatedText)}
                                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-green-500 text-white rounded-md hover:bg-green-600 active:scale-95 transition-all duration-200 shadow-sm font-medium"
                                                title="Copy text"
                                            >
                                                <Copy className="w-3 h-3" />
                                                Copy
                                            </button>
                                        )}
                                    </div>
                                    <div className="bg-white rounded p-2 border border-green-200 min-h-[120px] flex flex-col">
                                        <p className="text-xs text-gray-800 leading-relaxed flex-1">
                                            {uploadTranslatedText ? (
                                                uploadTranslatedText
                                            ) : fileUploading ? (
                                                <span className="text-green-600 italic">Translating...</span>
                                            ) : (
                                                <span className="text-gray-400">No translation yet</span>
                                            )}
                                        </p>
                                        {uploadTranslatedText && uploadTranslatedText.length > 0 && !fileUploading && (
                                            <div className="mt-2 pt-2 border-t border-green-100">
                                                <div className="flex items-center gap-2 text-xs">
                                                    <button
                                                        onClick={toggleTranslationAudio}
                                                        disabled={isGeneratingAudio}
                                                        className="flex items-center justify-center w-6 h-6 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:opacity-50 transition-all duration-200"
                                                    >
                                                        {isGeneratingAudio ? <Volume2 className="w-3 h-3 animate-pulse" /> :
                                                            isPlayingTranslation ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                                    </button>
                                                    <span className="text-xs text-gray-500 min-w-[24px]">
                                                        {Math.floor(translationAudioCurrentTime)}s
                                                    </span>
                                                    <div className="flex-1 relative">
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max={translationAudioDuration || 100}
                                                            value={translationAudioCurrentTime}
                                                            onChange={(e) => seekTranslationAudio(parseFloat(e.target.value))}
                                                            className="w-full h-1 bg-green-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                                                            style={{
                                                                background: `linear-gradient(to right, #10b981 0%, #10b981 ${(translationAudioCurrentTime / (translationAudioDuration || 100)) * 100}%, #cbd5e1 ${(translationAudioCurrentTime / (translationAudioDuration || 100)) * 100}%, #cbd5e1 100%)`
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-gray-500 min-w-[24px]">
                                                        {Math.floor(translationAudioDuration)}s
                                                    </span>
                                                    <button
                                                        onClick={downloadTranslationAudio}
                                                        disabled={isGeneratingAudio}
                                                        className="flex items-center justify-center w-6 h-6 bg-gray-500 text-white rounded-full hover:bg-gray-600 disabled:opacity-50 transition-all duration-200"
                                                        title="Download audio"
                                                    >
                                                        <Download className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VoiceTranslatePage;
