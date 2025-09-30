import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { favoritesApi } from '../services/api.ts';
import { TranslationResponse } from '../types';
import { Star, Trash } from 'lucide-react';

const FavoritesPage: React.FC = () => {
    const { user } = useAuth();
    const [favorites, setFavorites] = useState<TranslationResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            fetchFavorites();
        }
    }, [user]);

    const fetchFavorites = async () => {
        try {
            setLoading(true);
            const result = await favoritesApi.getFavorites();

            if (result.success && result.data) {
                setFavorites(result.data);
            } else {
                setError(result.error || 'Failed to fetch favorites');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveFavorite = async (translationId?: number) => {
        if (!translationId) return;

        try {
            const result = await favoritesApi.removeFromFavorites(translationId);

            if (result.success) {
                // Remove from the list
                setFavorites(prev => prev.filter(item => item.id !== translationId));
            } else {
                setError(result.error || 'Failed to remove from favorites');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    if (!user) {
        return (
            <div className="flex justify-center items-center h-full">
                <p>Vui lòng đăng nhập để xem trang này</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Bản dịch đã lưu</h1>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center items-center py-8">
                    <div className="spinner"></div>
                    <p className="ml-2">Đang tải...</p>
                </div>
            ) : favorites.length === 0 ? (
                <div className="bg-white shadow rounded-lg p-6 text-center">
                    <Star className="mx-auto h-12 w-12 text-yellow-400 mb-4" />
                    <p className="text-lg mb-2">Bạn chưa có bản dịch yêu thích nào</p>
                    <p className="text-gray-500">Nhấn vào biểu tượng sao bên cạnh kết quả dịch để lưu vào danh sách yêu thích</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {(Array.isArray(favorites) ? favorites : []).map((item) => (
                        <div key={item.id} className="bg-white shadow rounded-lg p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center">
                                    <Star className="h-5 w-5 text-yellow-400 mr-2" />
                                    <span className="text-sm text-gray-500">
                                        {item.source_language} → {item.target_language} ({item.translation_engine})
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleRemoveFavorite(item.id)}
                                    className="text-gray-400 hover:text-red-500"
                                    title="Xóa khỏi danh sách yêu thích"
                                >
                                    <Trash className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="mb-4">
                                <div className="text-sm text-gray-500 mb-1">Văn bản gốc:</div>
                                <div className="text-gray-900 border-l-4 border-gray-200 pl-3 py-1">
                                    {item.source_text}
                                </div>
                            </div>

                            <div className="mb-2">
                                <div className="text-sm text-gray-500 mb-1">Bản dịch:</div>
                                <div className="text-gray-900 border-l-4 border-primary-200 pl-3 py-1">
                                    {item.translated_text}
                                </div>
                            </div>

                            <div className="text-xs text-gray-500 text-right mt-2">
                                {formatDate(item.created_at)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FavoritesPage;
