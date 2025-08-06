import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { X, User, Lock, Mail, UserPlus } from 'lucide-react';

interface RegisterModalProps {
    onClose: () => void;
    onSwitchToLogin: () => void;
}

const RegisterModal: React.FC<RegisterModalProps> = ({ onClose, onSwitchToLogin }) => {
    const { register, isLoading } = useAuth();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const validateForm = () => {
        if (password !== confirmPassword) {
            setPasswordError('Mật khẩu nhập lại không khớp');
            return false;
        }
        setPasswordError('');
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        if (username && email && password) {
            const success = await register(username, email, password, fullName);
            if (success) {
                onClose();
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative animate-fade-in">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                    aria-label="Close"
                >
                    <X size={20} />
                </button>

                <h2 className="text-2xl font-bold text-secondary-900 mb-6 text-center">Đăng ký</h2>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-secondary-700 mb-1">Tên đăng nhập</label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-500">
                                <User size={18} />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="pl-10 w-full py-2 px-4 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="Nhập tên đăng nhập"
                                required
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-secondary-700 mb-1">Email</label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-500">
                                <Mail size={18} />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-10 w-full py-2 px-4 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="Nhập địa chỉ email"
                                required
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-secondary-700 mb-1">Họ và tên (tùy chọn)</label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-500">
                                <UserPlus size={18} />
                            </div>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="pl-10 w-full py-2 px-4 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="Nhập họ và tên của bạn"
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-secondary-700 mb-1">Mật khẩu</label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-500">
                                <Lock size={18} />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-10 w-full py-2 px-4 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="Nhập mật khẩu"
                                required
                            />
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-secondary-700 mb-1">Nhập lại mật khẩu</label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-500">
                                <Lock size={18} />
                            </div>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`pl-10 w-full py-2 px-4 border ${passwordError ? 'border-red-500' : 'border-secondary-300'
                                    } rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500`}
                                placeholder="Nhập lại mật khẩu"
                                required
                            />
                            {passwordError && <p className="text-red-500 text-sm mt-1">{passwordError}</p>}
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="inline-block animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                        ) : null}
                        {isLoading ? 'Đang xử lý...' : 'Đăng ký'}
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <p className="text-sm text-secondary-600">
                        Đã có tài khoản?{' '}
                        <button
                            onClick={onSwitchToLogin}
                            className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                            Đăng nhập
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterModal;
