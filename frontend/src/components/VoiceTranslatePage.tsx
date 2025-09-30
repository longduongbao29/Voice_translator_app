import React, { useState, useEffect } from 'react';
import { speechToTextApi } from '../services/api.ts';
import { Mic } from 'lucide-react';
import { useAudioRecorder } from '../hooks/useAudioRecorder.ts';
import LanguageSelector from './LanguageSelector.tsx';
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

    // Target language for translations (both realtime and upload)
    const [targetLang, setTargetLang] = useState<string>('vi');
    const [languages, setLanguages] = useState<Language[]>([]);
    const [activeTab, setActiveTab] = useState<'realtime' | 'upload'>('realtime');

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await translationApi.getLanguages();
                if (res.success && res.data && mounted) {
                    // res.data could be a dict/object from backend; map to array
                    const d: any = res.data;
                    if (Array.isArray(d)) setLanguages(d as Language[]);
                    else if (d.languages) {
                        const l = d.languages;
                        if (Array.isArray(l)) {
                            setLanguages(l as Language[]);
                        } else if (typeof l === 'object') {
                            const arr: Language[] = Object.entries(l).map(([code, name]) => ({ code, name } as Language));
                            setLanguages(arr);
                        }
                    } else {
                        // convert object map to array
                        const arr: Language[] = Object.entries(d).map(([code, name]) => ({ code, name } as Language));
                        setLanguages(arr);
                    }
                }
            } catch (err) {
                console.error('Failed to load languages', err);
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
                // Here you would send the audio to your backend for processing
                console.log('Audio recording stopped, blob size:', audioBlob.size);
                // Send audio blob to backend as realtime use-case
                setFileUploading(true);
                try {
                    const resp = await speechToTextApi.transcribeAudio(audioBlob, targetLang);
                    if (resp.success && resp.data) {
                        setLiveOriginalText(resp.data.source_text || resp.data.text || '');
                        setLiveTranslatedText(resp.data.translated_text || resp.data.text || '');
                    } else {
                        setLiveTranslatedText(resp.error || '');
                    }
                } catch (e) {
                    console.error('Realtime upload failed', e);
                } finally {
                    setFileUploading(false);
                }
            }
        } else {
            setLiveOriginalText('');
            setLiveTranslatedText('');
            await startRecording();
        }
    };

    return (
        <div className="flex flex-col items-center justify-start px-4 py-8">
            <div className="w-full max-w-4xl">
                <header className="mb-6 flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-secondary-900">Voice & File Translation</h1>
                        <p className="mt-1 text-sm text-secondary-600">Choose a tab and a target language.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:block">
                            <LanguageSelector
                                languages={languages}
                                selectedLanguage={targetLang}
                                onLanguageChange={setTargetLang}
                                label="Target"
                                includeAuto={false}
                            />
                        </div>
                        <div className="flex bg-gray-50 rounded-md p-1 shadow-sm">
                            <button
                                onClick={() => setActiveTab('realtime')}
                                className={`px-3 py-1 rounded-md ${activeTab === 'realtime' ? 'bg-white shadow' : 'text-gray-600'}`}
                            >
                                Mircrophone
                            </button>
                            <button
                                onClick={() => setActiveTab('upload')}
                                className={`ml-1 px-3 py-1 rounded-md ${activeTab === 'upload' ? 'bg-white shadow' : 'text-gray-600'}`}
                            >
                                Upload
                            </button>
                        </div>
                    </div>
                </header>

                <div className="mt-6 grid grid-cols-1 gap-6">
                    {/* Realtime microphone section */}
                    {activeTab === 'realtime' && (
                        <div className="p-6 bg-white shadow-sm rounded-lg hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold">Microphone</h2>
                                <div className="text-xs text-secondary-500">Live</div>
                            </div>
                            {/* shared target selector in header */}
                            <div className="mb-4 flex items-center justify-center relative">
                                {/* pulsing circle behind mic, scales with level (0..1) */}
                                <div
                                    aria-hidden
                                    style={{
                                        transform: `scale(${0.6 + level * 1.4})`,
                                        opacity: Math.max(0.15, Math.min(0.9, 0.15 + level * 0.85)),
                                        transition: 'transform 120ms linear, opacity 120ms linear'
                                    }}
                                    className="absolute rounded-full bg-primary-200 dark:bg-primary-800 w-32 h-32"
                                />
                                <button
                                    onClick={toggleRecording}
                                    aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                                    className={`relative z-10 rounded-full p-4 transition-all duration-200 flex items-center justify-center ${isRecording
                                        ? 'bg-red-500 shadow-inner'
                                        : 'bg-primary-600 hover:bg-primary-700 shadow-lg'
                                        }`}
                                >
                                    <Mic className="w-10 h-10 text-white" />
                                </button>
                            </div>
                            <div className="mb-3">
                                <h3 className="text-sm font-medium text-secondary-500">Original</h3>
                                <p className="text-base break-words">{isRecording ? 'Listening...' : liveOriginalText || 'No transcription yet'}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-secondary-500">Translation</h3>
                                <p className="text-base break-words">{isRecording ? 'Translating...' : liveTranslatedText || 'No translation yet'}</p>
                            </div>
                        </div>
                    )}

                    {/* File upload section */}
                    {activeTab === 'upload' && (
                        <div className="p-6 bg-white shadow-sm rounded-lg hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold">Upload Audio File</h2>
                                <div className="text-xs text-secondary-500">File</div>
                            </div>
                            {/* shared target selector in header */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-secondary-500">Select file</label>
                                <input
                                    type="file"
                                    accept="audio/*"
                                    onChange={async (e) => {
                                        const f = e.target.files && e.target.files[0];
                                        if (!f) return;
                                        setFileUploading(true);
                                        try {
                                            const resp = await speechToTextApi.transcribeAudio(f, targetLang);
                                            if (resp.success && resp.data) {
                                                setUploadOriginalText(resp.data.source_text || resp.data.text || '');
                                                setUploadTranslatedText(resp.data.translated_text || resp.data.text || '');
                                            } else {
                                                setUploadTranslatedText(resp.error || '');
                                            }
                                        } catch (err) {
                                            console.error('Upload error', err);
                                        } finally {
                                            setFileUploading(false);
                                        }
                                    }}
                                    className="mt-2"
                                />
                                {fileUploading && <p className="text-sm text-secondary-500 mt-2">Uploading...</p>}
                            </div>
                            <div className="mb-3">
                                <h3 className="text-sm font-medium text-secondary-500">Original</h3>
                                <p className="text-base break-words">{uploadOriginalText || 'No transcription yet'}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-secondary-500">Translation</h3>
                                <p className="text-base break-words">{uploadTranslatedText || 'No translation yet'}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VoiceTranslatePage;
