import axios from 'axios';
import {
  TranslationRequest,
  TranslationResponse,
  Language,
  LanguageDetectionResponse,
  ApiResponse,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  UserResponse
} from '../types';

// Sử dụng mặc định là localhost
const API_BASE_URL = 'http://localhost:8003/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const translationApi = {
  // Translate text
  translate: async (request: TranslationRequest): Promise<ApiResponse<TranslationResponse>> => {
    try {
      console.log('Translation request:', request);

      const response = await api.post('/translate/translate', request);
      return {
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Translation failed',
        success: false,
      };
    }
  },

  // Detect language
  detectLanguage: async (text: string): Promise<ApiResponse<LanguageDetectionResponse>> => {
    try {
      const response = await api.post('/translate/detect-language', { text });
      return {
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Language detection failed',
        success: false,
      };
    }
  },

  // Get supported languages
  getLanguages: async (): Promise<ApiResponse<Language[]>> => {
    try {
      const response = await api.get('/translate/languages');
      return {
        data: response.data.languages,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to fetch languages',
        success: false,
      };
    }
  },

  // Get translation history
  getHistory: async (skip = 0, limit = 100): Promise<ApiResponse<TranslationResponse[]>> => {
    try {
      const response = await api.get(`/translate/history?skip=${skip}&limit=${limit}`);
      return {
        data: response.data.translations,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to fetch history',
        success: false,
      };
    }
  },

  // Get favorite translations
  getFavorites: async (skip = 0, limit = 100): Promise<ApiResponse<TranslationResponse[]>> => {
    try {
      const response = await api.get(`/translate/favorites?skip=${skip}&limit=${limit}`);
      return {
        data: response.data.favorites,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to fetch favorites',
        success: false,
      };
    }
  },

  // Toggle favorite status for a translation
  toggleFavorite: async (translationId: number, isFavorite: boolean): Promise<ApiResponse<any>> => {
    try {
      const response = await api.put(`/translate/favorite/${translationId}`, {
        is_favorite: isFavorite
      });
      return {
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to update favorite status',
        success: false,
      };
    }
  },

  // Clear all translation history
  clearHistory: async (): Promise<ApiResponse<any>> => {
    try {
      const response = await api.delete('/translate/history');
      return {
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to clear history',
        success: false,
      };
    }
  },
};

export const speechToTextApi = {
  // Speech to text từ audio file
  transcribeAudio: async (audioBlob: Blob, language: string = 'auto'): Promise<ApiResponse<{ text: string; language?: string }>> => {
    try {
      // Validate the audio blob
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Invalid audio data: empty blob');
      }

      const formData = new FormData();

      // Ensure the file has a proper extension
      const fileName = `recording-${Date.now()}.webm`;

      // Add form data fields
      formData.append('audio', audioBlob, fileName);
      formData.append('language', language);
      formData.append('model_name', 'whisper-large-v3');

      console.log('Sending audio for transcription:');
      console.log('- Language:', language);
      console.log('- File size:', audioBlob.size);
      console.log('- File type:', audioBlob.type);
      console.log('- File name:', fileName);

      const response = await api.post('/speech2text/transcribe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds timeout for audio processing
      });

      console.log('Transcription response:', response.data);

      return {
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      console.error('Speech to text error:', error);

      // Log more detailed error information
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        console.error('Request was made but no response received');
      }

      return {
        error: error.response?.data?.detail || error.message || 'Speech to text failed',
        success: false,
      };
    }
  },

  connect: (onMessage: (message: string) => void, onError?: (error: Event) => void) => {
    // Ensure correct WebSocket URL for backend route /api/v1/ws/realtimestt
    let wsUrl = API_BASE_URL.replace('http', 'ws');
    wsUrl = wsUrl.replace(/\/api\/v1$/, '');
    const ws = new WebSocket(`${wsUrl}/api/v1/ws/realtimestt`);

    ws.onopen = () => {
      console.log('WebSocket connection established');
    };

    ws.onmessage = (event) => {
      onMessage(event.data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (onError) {
        onError(error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    return ws;
  },
};

export const authApi = {
  // Login
  login: async (credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> => {
    try {
      // Chuyển đổi thành FormData theo yêu cầu của OAuth2
      const formData = new FormData();
      formData.append('username', credentials.username);
      formData.append('password', credentials.password);

      const response = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      // Save token to localStorage
      if (response.data.access_token) {
        localStorage.setItem('authToken', response.data.access_token);
      }

      return {
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Login failed',
        success: false,
      };
    }
  },

  // Register
  register: async (userData: RegisterRequest): Promise<ApiResponse<UserResponse>> => {
    try {
      const response = await api.post('/auth/register', userData);
      return {
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Registration failed',
        success: false,
      };
    }
  },

  // Logout
  logout: (): void => {
    localStorage.removeItem('authToken');
  },

  // Get current user
  getCurrentUser: async (): Promise<ApiResponse<UserResponse>> => {
    try {
      const response = await api.get('/auth/me');
      return {
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to fetch user info',
        success: false,
      };
    }
  },
};

export const userApi = {
  // Get user profile
  getProfile: async (): Promise<ApiResponse<UserResponse>> => {
    try {
      const response = await api.get('/users/me');
      return {
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to fetch profile',
        success: false,
      };
    }
  },

  // Update user profile
  updateProfile: async (userData: Partial<UserResponse>): Promise<ApiResponse<UserResponse>> => {
    try {
      const response = await api.put('/users/me', userData);
      return {
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to update profile',
        success: false,
      };
    }
  },

  // Upload avatar
  uploadAvatar: async (file: File): Promise<ApiResponse<{ avatar_url: string }>> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return {
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to upload avatar',
        success: false,
      };
    }
  },

  // Get user preferences
  getPreferences: async (): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get('/users/preferences');
      return {
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to fetch preferences',
        success: false,
      };
    }
  },

  // Update user preferences
  updatePreferences: async (preferences: any): Promise<ApiResponse<any>> => {
    try {
      const response = await api.put('/users/preferences', preferences);
      return {
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to update preferences',
        success: false,
      };
    }
  },
};

export const favoritesApi = {
  // Get favorites
  getFavorites: async (skip = 0, limit = 100): Promise<ApiResponse<TranslationResponse[]>> => {
    try {
      const response = await api.get(`/translate/favorites?skip=${skip}&limit=${limit}`);
      return {
        data: response.data.favorites,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to fetch favorites',
        success: false,
      };
    }
  },

  // Toggle favorite status
  toggleFavorite: async (translationId: number, isFavorite: boolean): Promise<ApiResponse<any>> => {
    try {
      const response = await api.put(`/translate/favorite/${translationId}`, {
        is_favorite: isFavorite
      });
      return {
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to update favorite status',
        success: false,
      };
    }
  }
};

export default api;
