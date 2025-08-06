import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { userApi } from '../services/api.ts';
import { UserPreferences } from '../types';

const SettingsPage: React.FC = () => {
    const { user } = useAuth();
    const [preferences, setPreferences] = useState<UserPreferences>({
        default_source_language: 'auto',
        default_target_language: 'en',
        preferred_engine: 'google',
        theme: 'light',
        auto_detect: true,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            fetchPreferences();
        }
    }, [user]);

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

    return (
        <div className="container mx-auto max-w-2xl px-4 py-8">
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
                                <option value="local">Local Model</option>
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="auto_detect"
                                    checked={preferences.auto_detect}
                                    onChange={handleChange}
                                    className="mr-2"
                                />
                                <span className="text-gray-700">Tự động phát hiện ngôn ngữ</span>
                            </label>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Giao diện</h2>

                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                Giao diện
                            </label>
                            <div className="flex">
                                <label className="flex items-center mr-6">
                                    <input
                                        type="radio"
                                        name="theme"
                                        value="light"
                                        checked={preferences.theme === 'light'}
                                        onChange={handleChange}
                                        className="mr-2"
                                    />
                                    <span className="text-gray-700">Sáng</span>
                                </label>

                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="theme"
                                        value="dark"
                                        checked={preferences.theme === 'dark'}
                                        onChange={handleChange}
                                        className="mr-2"
                                    />
                                    <span className="text-gray-700">Tối</span>
                                </label>
                            </div>
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
            </div>
        </div>
    );
};

export default SettingsPage;
