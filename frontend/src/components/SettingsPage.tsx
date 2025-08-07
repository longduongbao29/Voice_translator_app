import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { userApi } from '../services/api.ts';
import { UserPreferences, CustomEndpoint, WebhookIntegration } from '../types';
import { Trash2, Edit2, Plus, Settings, Code, Share2 } from 'lucide-react';

const SettingsPage: React.FC = () => {
    const { user } = useAuth();
    const [preferences, setPreferences] = useState<UserPreferences>({
        default_source_language: 'auto',
        default_target_language: 'en',
        preferred_engine: 'google',
        preferred_speech2text: 'google',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Tab state
    const [activeTab, setActiveTab] = useState<'general' | 'developer' | 'app'>('general');

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

    const fetchPreferences = async () => {
        try {
            setLoading(true);
            const result = await userApi.getPreferences();

            if (result.success && result.data) {
                setPreferences(result.data);
            } else {
                setError(result.error || 'Failed to fetch preferences');
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

    useEffect(() => {
        if (user) {
            fetchPreferences();
            fetchCustomEndpoints();
            fetchWebhooks();
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setSaving(true);

        try {
            const result = await userApi.updatePreferences(preferences);

            if (result.success) {
                setSuccessMessage('Cài đặt đã được lưu thành công');
            } else {
                setError(result.error || 'Failed to save preferences');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setPreferences(prev => ({
                ...prev,
                [name]: checked
            }));
        } else {
            setPreferences(prev => ({
                ...prev,
                [name]: value
            }));
        }
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
                    {error}
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
                    </nav>
                </div>

                {/* Tab content */}
                <div>
                    {/* General Settings Tab */}
                    {activeTab === 'general' && (
                        <form onSubmit={handleSubmit}>
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Cài đặt dịch thuật</h2>

                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="default_source_language">
                                        Ngôn ngữ nguồn mặc định
                                    </label>
                                    <select
                                        id="default_source_language"
                                        name="default_source_language"
                                        value={preferences.default_source_language}
                                        onChange={handleChange}
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
                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="default_target_language">
                                        Ngôn ngữ đích mặc định
                                    </label>
                                    <select
                                        id="default_target_language"
                                        name="default_target_language"
                                        value={preferences.default_target_language}
                                        onChange={handleChange}
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
                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="preferred_engine">
                                        Công cụ dịch ưu tiên
                                    </label>
                                    <select
                                        id="preferred_engine"
                                        name="preferred_engine"
                                        value={preferences.preferred_engine}
                                        onChange={handleChange}
                                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    >
                                        <option value="google">Google Translate</option>
                                        <option value="openai">OpenAI</option>
                                        {customEndpoints
                                            .filter(ep => ep.endpoint_type === 'translation' && ep.is_active)
                                            .map(ep => (
                                                <option key={ep.id} value={`custom_${ep.id}`}>{ep.name}</option>
                                            ))
                                        }
                                    </select>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="preferred_speech2text">
                                        Công cụ chuyển đổi giọng nói thành văn bản ưu tiên
                                    </label>
                                    <select
                                        id="preferred_speech2text"
                                        name="preferred_speech2text"
                                        value={preferences.preferred_speech2text}
                                        onChange={handleChange}
                                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    >
                                        <option value="google">Google Speech-to-Text</option>
                                        <option value="openai">OpenAI Whisper</option>
                                        {customEndpoints
                                            .filter(ep => ep.endpoint_type === 'speech2text' && ep.is_active)
                                            .map(ep => (
                                                <option key={ep.id} value={`custom_${ep.id}`}>{ep.name}</option>
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
                                                            <p className="text-xs text-gray-500 mt-1">{endpoint.endpoint_url}</p>
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
                                                    const endpointUrlEl = formEl.elements.namedItem('endpoint_url') as HTMLInputElement;
                                                    const apiKeyEl = formEl.elements.namedItem('api_key') as HTMLInputElement;

                                                    if (editingEndpoint) {
                                                        const updatedEndpoint: CustomEndpoint = {
                                                            ...editingEndpoint,
                                                            name: nameEl.value,
                                                            endpoint_type: endpointTypeEl.value as 'speech2text' | 'translation',
                                                            endpoint_url: endpointUrlEl.value,
                                                            api_key: apiKeyEl.value || editingEndpoint.api_key
                                                        };
                                                        handleUpdateEndpoint(updatedEndpoint);
                                                    } else {
                                                        const newEndpoint: CustomEndpoint = {
                                                            name: nameEl.value,
                                                            endpoint_type: endpointTypeEl.value as 'speech2text' | 'translation',
                                                            endpoint_url: endpointUrlEl.value,
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
                                                        </select>
                                                    </div>

                                                    <div className="mb-4">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Endpoint URL
                                                        </label>
                                                        <input
                                                            name="endpoint_url"
                                                            defaultValue={editingEndpoint?.endpoint_url || ''}
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
                                                            <p className="text-xs text-gray-500 mt-1">{webhook.webhook_url}</p>
                                                        </div>
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={() => setEditingWebhook(webhook)}
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
                                                    const nameEl = formEl.elements.namedItem('name') as HTMLInputElement;
                                                    const platformEl = formEl.elements.namedItem('platform') as HTMLSelectElement;
                                                    const webhookUrlEl = formEl.elements.namedItem('webhook_url') as HTMLInputElement;
                                                    const secretKeyEl = formEl.elements.namedItem('secret_key') as HTMLInputElement;

                                                    if (editingWebhook) {
                                                        const updatedWebhook: WebhookIntegration = {
                                                            ...editingWebhook,
                                                            name: nameEl.value,
                                                            platform: platformEl.value as 'slack' | 'discord' | 'zalo' | 'custom',
                                                            webhook_url: webhookUrlEl.value,
                                                            secret_key: secretKeyEl.value || editingWebhook.secret_key
                                                        };
                                                        handleUpdateWebhook(updatedWebhook);
                                                    } else {
                                                        const newWebhook: WebhookIntegration = {
                                                            name: nameEl.value,
                                                            platform: platformEl.value as 'slack' | 'discord' | 'zalo' | 'custom',
                                                            webhook_url: webhookUrlEl.value,
                                                            secret_key: secretKeyEl.value || undefined,
                                                            event_types: ['translation_completed'],
                                                            is_active: true
                                                        };
                                                        handleAddWebhook(newWebhook);
                                                    }
                                                }}>
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

                                                    <div className="mb-4">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Platform
                                                        </label>
                                                        <select
                                                            name="platform"
                                                            defaultValue={editingWebhook?.platform || 'slack'}
                                                            className="w-full p-2 border rounded"
                                                        >
                                                            <option value="slack">Slack</option>
                                                            <option value="discord">Discord</option>
                                                            <option value="zalo">Zalo</option>
                                                            <option value="custom">Custom</option>
                                                        </select>
                                                    </div>

                                                    <div className="mb-4">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Webhook URL
                                                        </label>
                                                        <input
                                                            name="webhook_url"
                                                            defaultValue={editingWebhook?.webhook_url || ''}
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
                                                            defaultValue={editingWebhook?.secret_key || ''}
                                                            className="w-full p-2 border rounded"
                                                        />
                                                    </div>

                                                    <div className="flex justify-end space-x-2 mt-6">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setIsAddingWebhook(false);
                                                                setEditingWebhook(null);
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
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
