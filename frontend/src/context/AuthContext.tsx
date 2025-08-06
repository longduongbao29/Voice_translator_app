import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthState } from '../types';
import { authApi } from '../services/api.ts';
import toast from 'react-hot-toast';

interface AuthContextType extends AuthState {
    login: (username: string, password: string) => Promise<boolean>;
    register: (username: string, email: string, password: string, fullName?: string) => Promise<boolean>;
    logout: () => void;
    updateUser: (user: any) => void;
}

const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
};

const AuthContext = createContext<AuthContextType>({
    ...initialState,
    login: async () => false,
    register: async () => false,
    logout: () => { },
    updateUser: () => { },
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [state, setState] = useState<AuthState>(initialState);

    useEffect(() => {
        const checkAuthentication = async () => {
            const token = localStorage.getItem('authToken');
            if (!token) {
                setState({ user: null, isAuthenticated: false, isLoading: false });
                return;
            }

            try {
                const response = await authApi.getCurrentUser();
                if (response.success && response.data) {
                    setState({
                        user: response.data,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } else {
                    localStorage.removeItem('authToken');
                    setState({ user: null, isAuthenticated: false, isLoading: false });
                }
            } catch (error) {
                localStorage.removeItem('authToken');
                setState({ user: null, isAuthenticated: false, isLoading: false });
            }
        };

        checkAuthentication();
    }, []);

    const login = async (username: string, password: string): Promise<boolean> => {
        setState(prev => ({ ...prev, isLoading: true }));

        const response = await authApi.login({ username, password });

        if (response.success && response.data) {
            // Login succeeded, now fetch user info
            const userResponse = await authApi.getCurrentUser();

            if (userResponse.success && userResponse.data) {
                setState({
                    user: {
                        id: userResponse.data.id,
                        username: userResponse.data.username,
                        email: userResponse.data.email,
                        full_name: userResponse.data.full_name || userResponse.data.username
                    },
                    isAuthenticated: true,
                    isLoading: false,
                });
                toast.success('Đăng nhập thành công!');
                return true;
            } else {
                // We got token but failed to get user info
                setState(prev => ({ ...prev, isLoading: false }));
                toast.error('Đăng nhập thành công nhưng không lấy được thông tin người dùng');
                return true; // Still return true as login succeeded
            }
        } else {
            setState(prev => ({ ...prev, isLoading: false }));
            toast.error(response.error || 'Đăng nhập thất bại');
            return false;
        }
    };

    const register = async (username: string, email: string, password: string, fullName?: string): Promise<boolean> => {
        setState(prev => ({ ...prev, isLoading: true }));

        const response = await authApi.register({ username, email, password });

        if (response.success && response.data) {
            // Registration successful, now login with the new credentials
            const loginResult = await login(username, password);
            if (loginResult) {
                toast.success('Đăng ký thành công!');
                return true;
            } else {
                setState(prev => ({ ...prev, isLoading: false }));
                toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
                return true;
            }
        } else {
            setState(prev => ({ ...prev, isLoading: false }));
            toast.error(response.error || 'Đăng ký thất bại');
            return false;
        }
    };

    const logout = (): void => {
        authApi.logout();
        setState({ user: null, isAuthenticated: false, isLoading: false });
        toast.success('Đã đăng xuất');
    };

    const updateUser = (userData: any) => {
        setState(prevState => ({
            ...prevState,
            user: {
                ...prevState.user!,
                ...userData
            }
        }));
    };

    const value = {
        ...state,
        login,
        register,
        logout,
        updateUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
