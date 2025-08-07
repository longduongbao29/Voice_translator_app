import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { translationApi } from '../services/api.ts';
import { TranslationResponse } from '../types';
import { Clock, Star, Trash2, AlertTriangle } from 'lucide-react';

const HistoryPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [translations, setTranslations] = useState<TranslationResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [clearingHistory, setClearingHistory] = useState(false);
    const limit = 10;

    useEffect(() => {
        fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    const fetchHistory = async () => {
        if (!isAuthenticated) return;

        try {
            setLoading(true);
            const skip = page * limit;
            const result = await translationApi.getHistory(skip, limit);

            if (result.success && result.data) {
                if (result.data.length < limit) {
                    setHasMore(false);
                }

                if (page === 0) {
                    setTranslations(result.data || []);
                } else {
                    setTranslations(prev => [...prev, ...(result.data || [])]);
                }
            } else {
                setError(result.error || 'Failed to fetch history');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = () => {
        setPage(prev => prev + 1);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const handleToggleFavorite = async (translation: TranslationResponse) => {
        if (!isAuthenticated || !translation.id) return;

        try {
            const newFavoriteState = !translation.is_favorite;
            const result = await translationApi.toggleFavorite(translation.id, newFavoriteState);

            if (result.success) {
                // Update the local state
                setTranslations(prev =>
                    prev.map(item =>
                        item.id === translation.id
                            ? { ...item, is_favorite: newFavoriteState }
                            : item
                    )
                );
            } else {
                setError(result.error || 'Failed to update favorite status');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        }
    };

    const handleClearHistory = async () => {
        if (!isAuthenticated) return;
        setShowConfirmDialog(true);
    };

    const confirmClearHistory = async () => {
        try {
            setClearingHistory(true);
            const result = await translationApi.clearHistory();

            if (result.success) {
                setTranslations([]);
                setHasMore(false);
                setPage(0);
            } else {
                setError(result.error || 'Failed to clear history');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setClearingHistory(false);
            setShowConfirmDialog(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="flex justify-center items-center h-full">
                <p>Vui lòng đăng nhập để xem trang này</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Lịch sử dịch</h1>
                {translations.length > 0 && (
                    <button
                        onClick={handleClearHistory}
                        className="flex items-center bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-md transition-colors"
                        disabled={clearingHistory}
                    >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Xóa tất cả
                    </button>
                )}
            </div>

            {/* Confirm Dialog */}
            {showConfirmDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 m-4">
                        <div className="flex items-center text-red-600 mb-4">
                            <AlertTriangle className="w-6 h-6 mr-2" />
                            <h3 className="text-xl font-semibold">Xác nhận xóa</h3>
                        </div>
                        <p className="mb-6">Bạn có chắc chắn muốn xóa tất cả lịch sử dịch? Hành động này không thể hoàn tác.</p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowConfirmDialog(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                                disabled={clearingHistory}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={confirmClearHistory}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                                disabled={clearingHistory}
                            >
                                {clearingHistory ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        Đang xóa...
                                    </>
                                ) : (
                                    'Xóa tất cả'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {translations.length === 0 && !loading ? (
                <div className="bg-white shadow rounded-lg p-6 text-center">
                    <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p>Bạn chưa có lịch sử dịch nào.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {translations.map((translation, index) => (
                        <div key={translation.id || index} className="bg-white shadow rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center">
                                    <span className="text-sm font-medium text-gray-600 mr-2">
                                        {translation.source_language} → {translation.target_language}
                                    </span>
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                        {translation.translation_engine}
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => handleToggleFavorite(translation)}
                                        className={`p-1 rounded-full ${translation.is_favorite ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                                        title={translation.is_favorite ? "Xóa khỏi mục yêu thích" : "Thêm vào mục yêu thích"}
                                    >
                                        <Star className={`h-5 w-5 ${translation.is_favorite ? 'fill-yellow-500' : ''}`} />
                                    </button>
                                    <span className="text-xs text-gray-500">
                                        {formatDate(translation.created_at)}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Văn bản gốc:</div>
                                    <div className="text-sm text-gray-900 border-l-2 border-gray-200 pl-2 py-1 line-clamp-3">
                                        {translation.source_text}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Bản dịch:</div>
                                    <div className="text-sm text-gray-900 border-l-2 border-blue-200 pl-2 py-1 line-clamp-3">
                                        {translation.translated_text}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="bg-white shadow rounded-lg p-6 text-center">
                            <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
                            <p className="mt-2">Đang tải...</p>
                        </div>
                    )}

                    {hasMore && !loading && (
                        <div className="text-center py-4">
                            <button
                                onClick={handleLoadMore}
                                className="bg-blue-500 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
                            >
                                Tải thêm
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default HistoryPage;
