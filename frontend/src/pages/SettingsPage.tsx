import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { userApi, elevenLabsApi, text2speechApi } from '../services/api.ts';
import { UserSettings, CustomEndpoint, WebhookIntegration, ElevenLabsSettings, ElevenLabsVoice, ElevenLabsModel } from '../types';
import { Trash2, Edit2, Plus, Settings, Code, Share2, Volume2 } from 'lucide-react';

const SettingsPage: React.FC = () => {
    const { user } = useAuth();
    const [settings, setSettings] = useState<UserSettings>({
        src_lang: 'auto',
        trg_lang: 'en',
        translate_api: 'google',
        stt_api: 'groq',
        text2speech_api: 'elevenlabs',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Tab state
    const [activeTab, setActiveTab] = useState<'general' | 'developer' | 'app' | 'elevenlabs'>('general');

    // Custom endpoints state
    const [customEndpoints, setCustomEndpoints] = useState<CustomEndpoint[]>([]);
    const [loadingEndpoints, setLoadingEndpoints] = useState(false);
    const [editingEndpoint, setEditingEndpoint] = useState<CustomEndpoint | null>(null);
    const [isAddingEndpoint, setIsAddingEndpoint] = useState(false);

    // Webhooks state
    const [webhooks, setWebhooks] = useState<WebhookIntegration[]>([]);
    const [loadingWebhooks, setLoadingWebhooks] = useState(false);
    const [editingWebhook, setEditingWebhook] = useState<WebhookIntegration | null>(null);
    const [isAddingWebhook, setIsAddingWebhook] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState<'slack' | 'discord' | 'zalo' | 'custom'>('discord');

    // ElevenLabs state
    const [elevenLabsSettings, setElevenLabsSettings] = useState<ElevenLabsSettings>({
        model_id: 'eleven_multilingual_v2',
        voice_id: 'JBFqnCBsd6RMkjVDRZzb',
        voice_name: 'George',
        voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true
        },
        cloned_voices: []
    });
    // const [availableVoices, setAvailableVoices] = useState<ElevenLabsVoice[]>([]);
    // const [availableModels, setAvailableModels] = useState<ElevenLabsModel[]>([]);
    // const [loadingElevenLabs, setLoadingElevenLabs] = useState(false);
    // const [isCloning, setIsCloning] = useState(false);
    // const [cloneFiles, setCloneFiles] = useState<File[]>([]);

    // Additional ElevenLabs state for UI
    const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
    const [models, setModels] = useState<ElevenLabsModel[]>([]);
    const [previewLoading, setPreviewLoading] = useState<string | null>(null);
    const [cloneLoading, setCloneLoading] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [cloneForm, setCloneForm] = useState({
        name: '',
        description: '',
        files: [] as File[]
    });


    const fetchSettings = async () => {
        try {
            setLoading(true);
            const result = await userApi.getSettings();

            if (result.success && result.data) {
                setSettings(result.data);
            } else {
                setError(result.error || 'Failed to fetch settings');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomEndpoints = async () => {
        try {
            setLoadingEndpoints(true);
            const result = await userApi.getCustomEndpoints();

            if (result.success && result.data) {
                setCustomEndpoints(result.data);
            } else {
                setError(result.error || 'Failed to fetch custom endpoints');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred while fetching endpoints');
        } finally {
            setLoadingEndpoints(false);
        }
    };

    const fetchWebhooks = async () => {
        try {
            setLoadingWebhooks(true);
            const result = await userApi.getWebhooks();

            if (result.success && result.data) {
                setWebhooks(result.data);
            } else {
                setError(result.error || 'Failed to fetch webhooks');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred while fetching webhooks');
        } finally {
            setLoadingWebhooks(false);
        }
    };

    const fetchElevenLabsSettings = async () => {
        try {
            // Fetch settings, voices, and models in parallel
            const [settingsResult, voicesResult, modelsResult] = await Promise.all([
                elevenLabsApi.getSettings(),
                elevenLabsApi.getVoices(),
                elevenLabsApi.getModels()
            ]);

            if (settingsResult.success && settingsResult.data) {
                setElevenLabsSettings(settingsResult.data);
            }

            if (voicesResult.success && voicesResult.data) {
                setVoices(voicesResult.data.voices || []);
            } else {
                // Fallback voices if API fails
                setVoices([
                    { voice_id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', category: 'cloned' },
                    { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', category: 'premade' },
                    { voice_id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', category: 'premade' },
                    { voice_id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', category: 'premade' }
                ]);
            }

            if (modelsResult.success && modelsResult.data) {
                setModels(modelsResult.data.models || []);
            } else {
                // Fallback models if API fails
                setModels([
                    { model_id: 'eleven_multilingual_v2', name: 'Eleven Multilingual v2', description: 'Multilingual model supporting various languages' },
                    { model_id: 'eleven_monolingual_v1', name: 'Eleven Monolingual v1', description: 'English-only model with high quality' },
                    { model_id: 'eleven_turbo_v2', name: 'Eleven Turbo v2', description: 'Fast generation model for quick results' }
                ]);
            }

        } catch (err: any) {
            console.error('ElevenLabs fetch error:', err);
            setError('Failed to fetch ElevenLabs data. Using fallback voices.');

            // Set fallback data on error
            setVoices([
                { voice_id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', category: 'cloned' },
                { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', category: 'premade' },
                { voice_id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', category: 'premade' },
                { voice_id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', category: 'premade' }
            ]);
            setModels([
                { model_id: 'eleven_multilingual_v2', name: 'Eleven Multilingual v2', description: 'Multilingual model supporting various languages' },
                { model_id: 'eleven_monolingual_v1', name: 'Eleven Monolingual v1', description: 'English-only model with high quality' },
                { model_id: 'eleven_turbo_v2', name: 'Eleven Turbo v2', description: 'Fast generation model for quick results' }
            ]);
        }
    };

    const handlePreviewVoice = async (voiceId: string) => {
        try {
            setPreviewLoading(voiceId);
            setError(null); // Clear any previous errors

            // Create a simple preview text
            const previewText = "Hello, this is a voice preview from ElevenLabs. How does this voice sound to you?";

            // Use the text2speechApi from our services
            const response = await text2speechApi.synthesizeText(previewText, 'en', voiceId);

            if (response.success && response.data) {
                // response.data is a Blob containing the audio
                const audioBlob = response.data;

                // Create audio URL and play
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);

                // Add error handling for audio playback
                audio.onerror = () => {
                    setError('Failed to play audio preview. Please check your audio settings.');
                    URL.revokeObjectURL(audioUrl);
                };

                audio.onended = () => {
                    URL.revokeObjectURL(audioUrl);
                };

                // Set volume for better experience
                audio.volume = 0.8;

                await audio.play();

                // Show success message
                setSuccessMessage('Voice preview played successfully!');
                setTimeout(() => setSuccessMessage(null), 3000);

            } else {
                setError(response.error || 'Failed to generate voice preview. Please try again.');
            }
        } catch (err: any) {
            console.error('Preview voice error:', err);
            setError(err.message || 'Failed to preview voice. Please check your connection.');
        } finally {
            setPreviewLoading(null);
        }
    };

    const handleCloneVoice = async () => {
        if (!cloneForm.name || cloneForm.files.length === 0) {
            setError('Please provide a name and at least one audio file');
            return;
        }

        try {
            setCloneLoading(true);
            setError(null); // Clear previous errors

            const result = await elevenLabsApi.cloneVoice(
                cloneForm.name,
                cloneForm.description,
                cloneForm.files,
                true, // removeBackgroundNoise
                undefined // labels
            );

            if (result.success && result.data) {
                // Refresh ElevenLabs settings to get the new cloned voice
                await fetchElevenLabsSettings();

                // Reset the form
                setCloneForm({
                    name: '',
                    description: '',
                    files: []
                });

                setSuccessMessage('Voice cloned successfully!');
            } else {
                // Handle API errors more gracefully
                let errorMsg = 'Failed to clone voice';

                if (result.error) {
                    if (typeof result.error === 'string') {
                        errorMsg = result.error;
                    } else if (typeof result.error === 'object' && result.error !== null) {
                        const errorObj = result.error as any;
                        errorMsg = errorObj.detail || JSON.stringify(result.error);
                    } else {
                        errorMsg = String(result.error);
                    }
                }

                // Show user-friendly error messages
                if (errorMsg.includes('subscription')) {
                    errorMsg = '⚠️ Voice cloning requires an upgraded ElevenLabs subscription. Please upgrade your plan to use this feature.';
                } else if (errorMsg.includes('credits')) {
                    errorMsg = '⚠️ Insufficient credits in your ElevenLabs account. Please add more credits to continue.';
                } else if (errorMsg.includes('file')) {
                    errorMsg = '⚠️ Invalid or corrupted audio file. Please use high-quality WAV, MP3, or FLAC files.';
                }

                setError(errorMsg);
            }
        } catch (err: any) {
            console.error('Voice cloning error:', err);

            let errorMsg = 'An unexpected error occurred while cloning voice';

            if (err.response?.data?.detail) {
                errorMsg = err.response.data.detail;
            } else if (err.message) {
                errorMsg = err.message;
            }

            // Apply user-friendly formatting for common errors
            if (errorMsg.includes('subscription')) {
                errorMsg = '⚠️ Voice cloning requires an upgraded ElevenLabs subscription. Please upgrade your plan to use this feature.';
            } else if (errorMsg.includes('Network Error') || errorMsg.includes('timeout')) {
                errorMsg = '🌐 Network error. Please check your connection and try again.';
            }

            setError(errorMsg);
        } finally {
            setCloneLoading(false);
        }
    };

    const saveElevenLabsSettings = async () => {
        try {
            setSaveLoading(true);

            const result = await elevenLabsApi.updateSettings(elevenLabsSettings);

            if (result.success) {
                setSuccessMessage('ElevenLabs settings saved successfully!');
            } else {
                setError(result.error || 'Failed to save ElevenLabs settings');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to save ElevenLabs settings');
        } finally {
            setSaveLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchSettings(); // Load user settings for general tab
            fetchCustomEndpoints();
            fetchWebhooks();
            fetchElevenLabsSettings();
        }
    }, [user]);

    const handleSettingsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setSaving(true);

        try {
            const result = await userApi.updateSettings(settings);

            if (result.success) {
                setSuccessMessage('Cài đặt chung đã được lưu thành công');
            } else {
                setError(result.error || 'Failed to save settings');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setSaving(false);
        }
    };

    const handleSettingsChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: value
        }));
    };

    if (!user) {
        return (
            <div className="flex justify-center items-center h-full">
                <p>Vui lòng đăng nhập để xem trang này</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="container mx-auto max-w-2xl px-4 py-8">
                <h1 className="text-2xl font-bold mb-6">Cài đặt</h1>
                <div className="flex justify-center items-center py-8">
                    <div className="spinner"></div>
                    <p className="ml-2">Đang tải...</p>
                </div>
            </div>
        );
    }

    // Endpoint handlers
    const handleAddEndpoint = async (endpoint: CustomEndpoint) => {
        try {
            const result = await userApi.createCustomEndpoint(endpoint);
            if (result.success && result.data) {
                setCustomEndpoints([...customEndpoints, result.data]);
                setIsAddingEndpoint(false);
                setSuccessMessage('Custom endpoint added successfully');
            } else {
                setError(result.error || 'Failed to add custom endpoint');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        }
    };

    const handleUpdateEndpoint = async (endpoint: CustomEndpoint) => {
        if (!endpoint.id) return;

        try {
            const result = await userApi.updateCustomEndpoint(endpoint.id, endpoint);
            if (result.success && result.data) {
                const updatedEndpoints = customEndpoints.map(ep => {
                    return ep.id === endpoint.id ? result.data : ep;
                }) as CustomEndpoint[];
                setCustomEndpoints(updatedEndpoints);
                setEditingEndpoint(null);
                setSuccessMessage('Custom endpoint updated successfully');
            } else {
                setError(result.error || 'Failed to update custom endpoint');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        }
    };

    const handleDeleteEndpoint = async (id: number) => {
        try {
            const result = await userApi.deleteCustomEndpoint(id);
            if (result.success) {
                setCustomEndpoints(customEndpoints.filter(ep => ep.id !== id));
                setSuccessMessage('Custom endpoint deleted successfully');
            } else {
                setError(result.error || 'Failed to delete custom endpoint');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        }
    };

    // Webhook handlers
    const handleAddWebhook = async (webhook: WebhookIntegration) => {
        try {
            const result = await userApi.createWebhook(webhook);
            if (result.success && result.data) {
                setWebhooks([...webhooks, result.data]);
                setIsAddingWebhook(false);
                setSuccessMessage('Webhook added successfully');
            } else {
                setError(result.error || 'Failed to add webhook');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        }
    };

    const handleUpdateWebhook = async (webhook: WebhookIntegration) => {
        if (!webhook.id) return;

        try {
            const result = await userApi.updateWebhook(webhook.id, webhook);
            if (result.success && result.data) {
                const updatedWebhooks = webhooks.map(wh => {
                    return wh.id === webhook.id ? result.data : wh;
                }) as WebhookIntegration[];
                setWebhooks(updatedWebhooks);
                setEditingWebhook(null);
                setSuccessMessage('Webhook updated successfully');
            } else {
                setError(result.error || 'Failed to update webhook');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        }
    };

    const handleDeleteWebhook = async (id: number) => {
        try {
            const result = await userApi.deleteWebhook(id);
            if (result.success) {
                setWebhooks(webhooks.filter(wh => wh.id !== id));
                setSuccessMessage('Webhook deleted successfully');
            } else {
                setError(result.error || 'Failed to delete webhook');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        }
    };

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Cài đặt</h1>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {typeof error === 'string' ? error : JSON.stringify(error)}
                </div>
            )}

            {successMessage && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                    {successMessage}
                </div>
            )}

            <div className="bg-white shadow rounded-lg p-6">
                {/* Tabs */}
                <div className="border-b mb-6">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'general'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            onClick={() => setActiveTab('general')}
                        >
                            <span className="flex items-center">
                                <Settings className="w-5 h-5 mr-2" />
                                Chung
                            </span>
                        </button>

                        <button
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'developer'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            onClick={() => setActiveTab('developer')}
                        >
                            <span className="flex items-center">
                                <Code className="w-5 h-5 mr-2" />
                                Nhà phát triển
                            </span>
                        </button>

                        <button
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'app'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            onClick={() => setActiveTab('app')}
                        >
                            <span className="flex items-center">
                                <Share2 className="w-5 h-5 mr-2" />
                                Ứng dụng
                            </span>
                        </button>

                        <button
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'elevenlabs'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            onClick={() => setActiveTab('elevenlabs')}
                        >
                            <span className="flex items-center">
                                <Volume2 className="w-5 h-5 mr-2" />
                                ElevenLabs
                            </span>
                        </button>
                    </nav>
                </div>

                {/* Tab content */}
                <div>
                    {/* General Settings Tab */}
                    {activeTab === 'general' && (
                        <form onSubmit={handleSettingsSubmit}>
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Cài đặt dịch thuật</h2>

                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="src_lang">
                                        Ngôn ngữ nguồn mặc định
                                    </label>
                                    <select
                                        id="src_lang"
                                        name="src_lang"
                                        value={settings.src_lang}
                                        onChange={handleSettingsChange}
                                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    >
                                        <option value="auto">Tự động phát hiện</option>
                                        <option value="en">Tiếng Anh</option>
                                        <option value="vi">Tiếng Việt</option>
                                        <option value="ja">Tiếng Nhật</option>
                                        <option value="ko">Tiếng Hàn</option>
                                        <option value="zh">Tiếng Trung</option>
                                        <option value="fr">Tiếng Pháp</option>
                                        <option value="de">Tiếng Đức</option>
                                        <option value="ru">Tiếng Nga</option>
                                        <option value="es">Tiếng Tây Ban Nha</option>
                                    </select>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="trg_lang">
                                        Ngôn ngữ đích mặc định
                                    </label>
                                    <select
                                        id="trg_lang"
                                        name="trg_lang"
                                        value={settings.trg_lang}
                                        onChange={handleSettingsChange}
                                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    >
                                        <option value="en">Tiếng Anh</option>
                                        <option value="vi">Tiếng Việt</option>
                                        <option value="ja">Tiếng Nhật</option>
                                        <option value="ko">Tiếng Hàn</option>
                                        <option value="zh">Tiếng Trung</option>
                                        <option value="fr">Tiếng Pháp</option>
                                        <option value="de">Tiếng Đức</option>
                                        <option value="ru">Tiếng Nga</option>
                                        <option value="es">Tiếng Tây Ban Nha</option>
                                    </select>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="translate_api">
                                        Công cụ dịch ưu tiên
                                    </label>
                                    <select
                                        id="translate_api"
                                        name="translate_api"
                                        value={settings.translate_api}
                                        onChange={handleSettingsChange}
                                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    >
                                        <option value="google">Google Translate API</option>

                                        {customEndpoints
                                            .filter(ep => ep.endpoint_type === 'translation')
                                            .map(ep => (
                                                <option key={ep.id} value={`custom_${ep.id}`}>{ep.name}</option>
                                            ))
                                        }
                                    </select>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="stt_api">
                                        Công cụ chuyển đổi giọng nói thành văn bản ưu tiên
                                    </label>
                                    <select
                                        id="stt_api"
                                        name="stt_api"
                                        value={settings.stt_api}
                                        onChange={handleSettingsChange}
                                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    >

                                        <option value="groq">Groq Whisper</option>
                                        {customEndpoints
                                            .filter(ep => ep.endpoint_type === 'speech2text')
                                            .map(ep => (
                                                <option key={ep.id} value={ep.name}>
                                                    {ep.name} (Custom)
                                                </option>
                                            ))
                                        }
                                    </select>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="text2speech_api">
                                        Công cụ chuyển đổi văn bản thành giọng nói ưu tiên
                                    </label>
                                    <select
                                        id="text2speech_api"
                                        name="text2speech_api"
                                        value={settings.text2speech_api}
                                        onChange={handleSettingsChange}
                                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    >
                                        <option value="elevenlabs">ElevenLabs API</option>
                                        {customEndpoints
                                            .filter(ep => ep.endpoint_type === 'text2speech')
                                            .map(ep => (
                                                <option key={ep.id} value={ep.name}>
                                                    {ep.name} (Custom)
                                                </option>
                                            ))
                                        }
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    className="bg-primary-500 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                    disabled={saving}
                                >
                                    {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Developer Tab */}
                    {activeTab === 'developer' && (
                        <div>
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Cài đặt dành cho nhà phát triển</h2>

                                <p className="text-gray-500 text-sm mb-4">
                                    Các API endpoint tùy chỉnh thay thế API mặc định của hệ thống
                                </p>

                                <div className="mt-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-md font-semibold">Custom Endpoints</h3>
                                        <button
                                            type="button"
                                            onClick={() => setIsAddingEndpoint(true)}
                                            className="bg-primary-500 hover:bg-primary-700 text-white px-3 py-1 rounded text-sm flex items-center"
                                        >
                                            <Plus className="w-4 h-4 mr-1" />
                                            Add Endpoint
                                        </button>
                                    </div>

                                    {loadingEndpoints ? (
                                        <div className="flex justify-center items-center py-4">
                                            <div className="spinner"></div>
                                            <p className="ml-2">Loading endpoints...</p>
                                        </div>
                                    ) : customEndpoints.length === 0 ? (
                                        <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                                            No custom endpoints configured
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {customEndpoints.map(endpoint => (
                                                <div key={endpoint.id} className="border rounded-lg p-4 bg-gray-50">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-medium">{endpoint.name}</h4>
                                                            <p className="text-sm text-gray-600">Type: {endpoint.endpoint_type}</p>
                                                            <p className="text-xs text-gray-500 mt-1">{endpoint.api_url}</p>
                                                        </div>
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={() => setEditingEndpoint(endpoint)}
                                                                className="text-blue-600 hover:text-blue-800"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => endpoint.id && handleDeleteEndpoint(endpoint.id)}
                                                                className="text-red-600 hover:text-red-800"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Add/Edit Endpoint Form */}
                                    {(isAddingEndpoint || editingEndpoint) && (
                                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                            <div className="bg-white rounded-lg p-6 max-w-md w-full">
                                                <h3 className="text-lg font-semibold mb-4">
                                                    {isAddingEndpoint ? 'Add New Endpoint' : 'Edit Endpoint'}
                                                </h3>
                                                <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                                                    e.preventDefault();
                                                    const formEl = e.currentTarget;
                                                    const nameEl = formEl.elements.namedItem('name') as HTMLInputElement;
                                                    const endpointTypeEl = formEl.elements.namedItem('endpoint_type') as HTMLSelectElement;
                                                    const apiUrlEl = formEl.elements.namedItem('api_url') as HTMLInputElement;
                                                    const apiKeyEl = formEl.elements.namedItem('api_key') as HTMLInputElement;

                                                    if (editingEndpoint) {
                                                        const updatedEndpoint: CustomEndpoint = {
                                                            ...editingEndpoint,
                                                            name: nameEl.value,
                                                            endpoint_type: endpointTypeEl.value as 'speech2text' | 'translation' | 'text2speech',
                                                            api_url: apiUrlEl.value,
                                                            api_key: apiKeyEl.value || editingEndpoint.api_key
                                                        };
                                                        handleUpdateEndpoint(updatedEndpoint);
                                                    } else {
                                                        const newEndpoint: CustomEndpoint = {
                                                            name: nameEl.value,
                                                            endpoint_type: endpointTypeEl.value as 'speech2text' | 'translation' | 'text2speech',
                                                            api_url: apiUrlEl.value,
                                                            api_key: apiKeyEl.value || undefined,
                                                            is_active: true
                                                        };
                                                        handleAddEndpoint(newEndpoint);
                                                    }
                                                }}>
                                                    <div className="mb-4">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Name
                                                        </label>
                                                        <input
                                                            name="name"
                                                            defaultValue={editingEndpoint?.name || ''}
                                                            className="w-full p-2 border rounded"
                                                            required
                                                        />
                                                    </div>

                                                    <div className="mb-4">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Type
                                                        </label>
                                                        <select
                                                            name="endpoint_type"
                                                            defaultValue={editingEndpoint?.endpoint_type || 'translation'}
                                                            className="w-full p-2 border rounded"
                                                        >
                                                            <option value="translation">Translation</option>
                                                            <option value="speech2text">Speech to Text</option>
                                                            <option value="text2speech">Text to Speech</option>
                                                        </select>
                                                    </div>

                                                    <div className="mb-4">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Endpoint URL
                                                        </label>
                                                        <input
                                                            name="api_url"
                                                            defaultValue={editingEndpoint?.api_url || ''}
                                                            className="w-full p-2 border rounded"
                                                            required
                                                        />
                                                    </div>

                                                    <div className="mb-4">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            API Key (optional)
                                                        </label>
                                                        <input
                                                            name="api_key"
                                                            type="password"
                                                            defaultValue={editingEndpoint?.api_key || ''}
                                                            className="w-full p-2 border rounded"
                                                        />
                                                    </div>

                                                    <div className="flex justify-end space-x-2 mt-6">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setIsAddingEndpoint(false);
                                                                setEditingEndpoint(null);
                                                            }}
                                                            className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="submit"
                                                            className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600"
                                                        >
                                                            {isAddingEndpoint ? 'Add' : 'Save Changes'}
                                                        </button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* App Integration Tab */}
                    {activeTab === 'app' && (
                        <div>
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Tích hợp ứng dụng</h2>

                                <p className="text-gray-500 text-sm mb-4">
                                    Kết nối với các dịch vụ bên thứ ba như Slack, Discord, Zalo thông qua webhook
                                </p>

                                <div className="mt-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-md font-semibold">Webhook Integrations</h3>
                                        <button
                                            type="button"
                                            onClick={() => setIsAddingWebhook(true)}
                                            className="bg-primary-500 hover:bg-primary-700 text-white px-3 py-1 rounded text-sm flex items-center"
                                        >
                                            <Plus className="w-4 h-4 mr-1" />
                                            Add Webhook
                                        </button>
                                    </div>

                                    {loadingWebhooks ? (
                                        <div className="flex justify-center items-center py-4">
                                            <div className="spinner"></div>
                                            <p className="ml-2">Loading webhooks...</p>
                                        </div>
                                    ) : webhooks.length === 0 ? (
                                        <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                                            No webhook integrations configured
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {webhooks.map(webhook => (
                                                <div key={webhook.id} className="border rounded-lg p-4 bg-gray-50">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-medium">{webhook.name}</h4>
                                                            <p className="text-sm text-gray-600">Platform: {webhook.platform}</p>
                                                            {webhook.meta_data?.webhook_url && (
                                                                <p className="text-xs text-gray-500 mt-1">{webhook.meta_data.webhook_url}</p>
                                                            )}
                                                            {webhook.meta_data?.channel_id && (
                                                                <p className="text-xs text-gray-500 mt-1">Channel ID: {webhook.meta_data.channel_id}</p>
                                                            )}
                                                        </div>
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingWebhook(webhook);
                                                                    setSelectedPlatform(webhook.platform);
                                                                }}
                                                                className="text-blue-600 hover:text-blue-800"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => webhook.id && handleDeleteWebhook(webhook.id)}
                                                                className="text-red-600 hover:text-red-800"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Add/Edit Webhook Form */}
                                    {(isAddingWebhook || editingWebhook) && (
                                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                            <div className="bg-white rounded-lg p-6 max-w-md w-full">
                                                <h3 className="text-lg font-semibold mb-4">
                                                    {isAddingWebhook ? 'Add New Webhook' : 'Edit Webhook'}
                                                </h3>
                                                <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                                                    e.preventDefault();
                                                    const formEl = e.currentTarget;
                                                    const platformEl = formEl.elements.namedItem('platform') as HTMLSelectElement;

                                                    if (!platformEl) {
                                                        console.error('Platform select field not found');
                                                        return;
                                                    }

                                                    const currentPlatform = platformEl.value as 'slack' | 'discord' | 'zalo' | 'custom';
                                                    console.log('Current platform:', currentPlatform);

                                                    let metaData: Record<string, any> = {

                                                    };

                                                    let webhookName = `${currentPlatform.charAt(0).toUpperCase() + currentPlatform.slice(1)} Integration`;

                                                    if (currentPlatform === 'discord') {
                                                        const channelIdEl = formEl.elements.namedItem('channel_id') as HTMLInputElement;
                                                        if (channelIdEl) {
                                                            metaData.channel_id = channelIdEl.value;
                                                            console.log('Discord channel ID:', channelIdEl.value);
                                                        } else {
                                                            console.error('Channel ID field not found for Discord platform');
                                                            return;
                                                        }
                                                    } else {
                                                        const nameEl = formEl.elements.namedItem('name') as HTMLInputElement;
                                                        const webhookUrlEl = formEl.elements.namedItem('webhook_url') as HTMLInputElement;
                                                        const secretKeyEl = formEl.elements.namedItem('secret_key') as HTMLInputElement;

                                                        if (nameEl && nameEl.value) {
                                                            webhookName = nameEl.value;
                                                        }
                                                        if (webhookUrlEl) {
                                                            metaData.webhook_url = webhookUrlEl.value;
                                                            console.log('Webhook URL:', webhookUrlEl.value);
                                                        } else {
                                                            console.error('Webhook URL field not found for non-Discord platform');
                                                            return;
                                                        }
                                                        if (secretKeyEl && secretKeyEl.value) {
                                                            metaData.secret_key = secretKeyEl.value;
                                                        }
                                                    }

                                                    const webhookData: WebhookIntegration = {
                                                        name: webhookName,
                                                        platform: currentPlatform,
                                                        meta_data: metaData
                                                    };

                                                    console.log('Submitting webhook data:', webhookData);

                                                    if (editingWebhook) {
                                                        const updatedWebhook: WebhookIntegration = {
                                                            ...editingWebhook,
                                                            ...webhookData
                                                        };
                                                        handleUpdateWebhook(updatedWebhook);
                                                    } else {
                                                        handleAddWebhook(webhookData);
                                                    }
                                                }}>
                                                    {(editingWebhook?.platform || selectedPlatform) !== 'discord' && (
                                                        <div className="mb-4">
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Name
                                                            </label>
                                                            <input
                                                                name="name"
                                                                defaultValue={editingWebhook?.name || ''}
                                                                className="w-full p-2 border rounded"
                                                                required
                                                            />
                                                        </div>
                                                    )}

                                                    <div className="mb-4">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Platform
                                                        </label>
                                                        <select
                                                            name="platform"
                                                            value={editingWebhook?.platform || selectedPlatform}
                                                            onChange={(e) => {
                                                                const platform = e.target.value as 'slack' | 'discord' | 'zalo' | 'custom';
                                                                setSelectedPlatform(platform);
                                                            }}
                                                            className="w-full p-2 border rounded"
                                                        >
                                                            <option value="discord">Discord</option>
                                                            <option value="slack">Slack</option>
                                                            <option value="zalo">Zalo</option>
                                                            <option value="custom">Custom</option>
                                                        </select>
                                                    </div>

                                                    {(editingWebhook?.platform || selectedPlatform) === 'discord' ? (
                                                        <div className="mb-4">
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Channel ID
                                                            </label>
                                                            <input
                                                                name="channel_id"
                                                                defaultValue={editingWebhook?.meta_data?.channel_id || ''}
                                                                className="w-full p-2 border rounded"
                                                                placeholder="Enter Discord Channel ID"
                                                                required
                                                            />
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="mb-4">
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Webhook URL
                                                                </label>
                                                                <input
                                                                    name="webhook_url"
                                                                    defaultValue={editingWebhook?.meta_data?.webhook_url || ''}
                                                                    className="w-full p-2 border rounded"
                                                                    required
                                                                />
                                                            </div>

                                                            <div className="mb-4">
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Secret Key (optional)
                                                                </label>
                                                                <input
                                                                    name="secret_key"
                                                                    type="password"
                                                                    defaultValue={editingWebhook?.meta_data?.secret_key || ''}
                                                                    className="w-full p-2 border rounded"
                                                                />
                                                            </div>
                                                        </>
                                                    )}

                                                    <div className="flex justify-end space-x-2 mt-6">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setIsAddingWebhook(false);
                                                                setEditingWebhook(null);
                                                                setSelectedPlatform('discord'); // Reset to default
                                                            }}
                                                            className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="submit"
                                                            className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600"
                                                        >
                                                            {isAddingWebhook ? 'Add' : 'Save Changes'}
                                                        </button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ElevenLabs Settings Tab */}
                    {activeTab === 'elevenlabs' && (
                        <div className="mt-4">
                            <div className="space-y-6">
                                {/* Model Selection */}
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Model
                                    </label>
                                    <select
                                        value={elevenLabsSettings?.model_id || 'eleven_multilingual_v2'}
                                        onChange={(e) => setElevenLabsSettings(prev => ({ ...prev!, model_id: e.target.value }))}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    >
                                        {models.map((model) => (
                                            <option key={model.model_id} value={model.model_id}>
                                                {model.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Voice Selection */}
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Voice
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {voices.map((voice) => (
                                            <div
                                                key={voice.voice_id}
                                                className={`border rounded-lg p-3 cursor-pointer transition-colors ${elevenLabsSettings?.voice_id === voice.voice_id
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                                onClick={() => setElevenLabsSettings(prev => ({ ...prev!, voice_id: voice.voice_id }))}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="text-sm font-medium text-gray-900">{voice.name}</h4>
                                                        <p className="text-xs text-gray-500 capitalize">{voice.category}</p>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handlePreviewVoice(voice.voice_id);
                                                        }}
                                                        className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        disabled={previewLoading === voice.voice_id}
                                                        title={previewLoading === voice.voice_id ? 'Playing preview...' : 'Play voice preview'}
                                                    >
                                                        {previewLoading === voice.voice_id ? (
                                                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                        ) : (
                                                            <Volume2 className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Voice Settings */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Voice Settings</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Stability: {elevenLabsSettings?.voice_settings?.stability || 0.5}
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.1"
                                                value={elevenLabsSettings?.voice_settings?.stability || 0.5}
                                                onChange={(e) => setElevenLabsSettings(prev => ({
                                                    ...prev!,
                                                    voice_settings: {
                                                        ...prev?.voice_settings,
                                                        stability: parseFloat(e.target.value)
                                                    }
                                                }))}
                                                className="w-full"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Similarity Boost: {elevenLabsSettings?.voice_settings?.similarity_boost || 0.5}
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.1"
                                                value={elevenLabsSettings?.voice_settings?.similarity_boost || 0.5}
                                                onChange={(e) => setElevenLabsSettings(prev => ({
                                                    ...prev!,
                                                    voice_settings: {
                                                        ...prev?.voice_settings,
                                                        similarity_boost: parseFloat(e.target.value)
                                                    }
                                                }))}
                                                className="w-full"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Style: {elevenLabsSettings?.voice_settings?.style || 0}
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.1"
                                                value={elevenLabsSettings?.voice_settings?.style || 0}
                                                onChange={(e) => setElevenLabsSettings(prev => ({
                                                    ...prev!,
                                                    voice_settings: {
                                                        ...prev?.voice_settings,
                                                        style: parseFloat(e.target.value)
                                                    }
                                                }))}
                                                className="w-full"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Voice Cloning */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Voice Cloning</h3>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Voice Name
                                            </label>
                                            <input
                                                type="text"
                                                value={cloneForm.name}
                                                onChange={(e) => setCloneForm(prev => ({ ...prev, name: e.target.value }))}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                placeholder="Enter a name for the cloned voice"
                                            />
                                        </div>
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Description (Optional)
                                            </label>
                                            <textarea
                                                value={cloneForm.description}
                                                onChange={(e) => setCloneForm(prev => ({ ...prev, description: e.target.value }))}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                rows={3}
                                                placeholder="Describe the voice characteristics"
                                            />
                                        </div>
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Audio Files
                                            </label>
                                            <input
                                                type="file"
                                                multiple
                                                accept="audio/*"
                                                onChange={(e) => setCloneForm(prev => ({ ...prev, files: Array.from(e.target.files || []) }))}
                                                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Upload 1-5 audio files (max 10MB each). Better quality audio produces better voice clones.
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleCloneVoice}
                                            disabled={!cloneForm.name || cloneForm.files.length === 0 || cloneLoading}
                                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {cloneLoading ? 'Cloning Voice...' : 'Clone Voice'}
                                        </button>
                                    </div>
                                </div>

                                {/* Cloned Voices */}
                                {elevenLabsSettings?.cloned_voices && elevenLabsSettings.cloned_voices.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-lg font-medium text-gray-900 mb-4">Your Cloned Voices</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {elevenLabsSettings.cloned_voices.map((voice) => (
                                                <div
                                                    key={voice.voice_id}
                                                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${elevenLabsSettings?.voice_id === voice.voice_id
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                        }`}
                                                    onClick={() => setElevenLabsSettings(prev => ({ ...prev!, voice_id: voice.voice_id }))}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <h4 className="text-sm font-medium text-gray-900">{voice.name}</h4>
                                                            <p className="text-xs text-gray-500">Cloned Voice</p>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handlePreviewVoice(voice.voice_id);
                                                            }}
                                                            className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            disabled={previewLoading === voice.voice_id}
                                                            title={previewLoading === voice.voice_id ? 'Playing preview...' : 'Play voice preview'}
                                                        >
                                                            {previewLoading === voice.voice_id ? (
                                                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                            ) : (
                                                                <Volume2 className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Save Button */}
                                <div className="pt-6 border-t">
                                    <button
                                        onClick={saveElevenLabsSettings}
                                        disabled={saveLoading}
                                        className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {saveLoading ? 'Saving...' : 'Save ElevenLabs Settings'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
