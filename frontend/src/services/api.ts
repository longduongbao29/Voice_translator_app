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
  UserResponse,
  UserSettings,
  CustomEndpoint,
  WebhookIntegration
} from '../types';

// Default to localhost
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

  // Get translation history
  // `skip` is the number of items to skip (offset). Backend returns { translations: [...] }
  getHistory: async (skip: number = 0, limit: number = 10): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get(`/translate/history?skip=${skip}&limit=${limit}`);
      const translations = response.data?.translations ?? response.data;
      return {
        data: translations,
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
  getFavorites: async (page: number = 1, limit: number = 10): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get(`/translate/favorites?page=${page}&limit=${limit}`);
      return {
        data: response.data,
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
      const response = await api.put(`/translate/favorite/${translationId}`, { is_favorite: isFavorite });
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

  // Delete translation history item
  deleteHistoryItem: async (translationId: number): Promise<ApiResponse<any>> => {
    try {
      await api.delete(`/translate/${translationId}`);
      return {
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to delete history item',
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

  // Get supported languages
  getLanguages: async (): Promise<ApiResponse<Language[]>> => {
    try {
      const response = await api.get('/translate/languages');
      return {
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to fetch languages',
        success: false,
      };
    }
  },

  // Detect language of text
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
};

export const speechToTextApi = {
  // Transcribe audio to text
  transcribeAudio: async (audioBlob: Blob | File, targetLanguage: string = 'auto'): Promise<ApiResponse<any>> => {
    try {
      const formData = new FormData();
      // Backend expects field name 'audio' (UploadFile = File(... ) param name)
      // preserve filename if File provided
      if ((audioBlob as File).name) {
        formData.append('audio', audioBlob as File, (audioBlob as File).name);
      } else {
        formData.append('audio', audioBlob as Blob, 'audio.webm');
      }
      // Send the desired target language for translation
      formData.append('target_language', targetLanguage);

      // Use axios directly and set multipart/form-data so the backend receives a proper form
      const url = `${API_BASE_URL}/speech2text/transcribe`;
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'multipart/form-data',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await axios.post(url, formData, { headers });
      return {
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Transcription failed',
        success: false,
      };
    }
  },
};

export const authApi = {
  // Login user
  login: async (loginData: LoginRequest): Promise<ApiResponse<AuthResponse>> => {
    try {
      const formData = new FormData();
      formData.append('username', loginData.username);
      formData.append('password', loginData.password);

      const response = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

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

  // Register user
  register: async (registerData: RegisterRequest): Promise<ApiResponse<any>> => {
    try {
      const response = await api.post('/auth/register', registerData);
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

  // Get current user info
  getCurrentUser: async (): Promise<ApiResponse<UserResponse>> => {
    try {
      const response = await api.get('/users/me');
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

  // Logout user
  logout: (): void => {
    localStorage.removeItem('authToken');
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
  updateProfile: async (userData: any): Promise<ApiResponse<any>> => {
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
  uploadAvatar: async (file: File): Promise<ApiResponse<any>> => {
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

  // Get user settings
  getSettings: async (): Promise<ApiResponse<UserSettings>> => {
    try {
      const response = await api.get('/users/settings');
      return {
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to fetch settings',
        success: false,
      };
    }
  },

  // Update user settings
  updateSettings: async (settings: Partial<UserSettings>): Promise<ApiResponse<UserSettings>> => {
    try {
      const response = await api.put('/users/settings', settings);
      return {
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to update settings',
        success: false,
      };
    }
  },

  // Developer API - Custom Endpoints
  getCustomEndpoints: async (): Promise<ApiResponse<CustomEndpoint[]>> => {
    try {
      const response = await api.get('/developer/custom-endpoints');
      return {
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to fetch custom endpoints',
        success: false,
      };
    }
  },

  getCustomEndpoint: async (id: number): Promise<ApiResponse<CustomEndpoint>> => {
    try {
      const response = await api.get(`/developer/custom-endpoints/${id}`);
      return {
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to fetch custom endpoint',
        success: false,
      };
    }
  },

  createCustomEndpoint: async (endpoint: CustomEndpoint): Promise<ApiResponse<CustomEndpoint>> => {
    try {
      const response = await api.post('/developer/custom-endpoints', endpoint);
      return {
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to create custom endpoint',
        success: false,
      };
    }
  },

  updateCustomEndpoint: async (id: number, endpoint: CustomEndpoint): Promise<ApiResponse<CustomEndpoint>> => {
    try {
      const response = await api.put(`/developer/custom-endpoints/${id}`, endpoint);
      return {
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to update custom endpoint',
        success: false,
      };
    }
  },

  deleteCustomEndpoint: async (id: number): Promise<ApiResponse<any>> => {
    try {
      await api.delete(`/developer/custom-endpoints/${id}`);
      return {
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to delete custom endpoint',
        success: false,
      };
    }
  },

  // Developer API - Webhooks
  getWebhooks: async (): Promise<ApiResponse<WebhookIntegration[]>> => {
    try {
      const response = await api.get('/developer/webhooks');
      return {
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to fetch webhooks',
        success: false,
      };
    }
  },

  getWebhook: async (id: number): Promise<ApiResponse<WebhookIntegration>> => {
    try {
      const response = await api.get(`/developer/webhooks/${id}`);
      return {
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to fetch webhook',
        success: false,
      };
    }
  },

  createWebhook: async (webhook: WebhookIntegration): Promise<ApiResponse<WebhookIntegration>> => {
    try {
      const response = await api.post('/developer/webhooks', webhook);
      return {
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to create webhook',
        success: false,
      };
    }
  },

  updateWebhook: async (id: number, webhook: WebhookIntegration): Promise<ApiResponse<WebhookIntegration>> => {
    try {
      const response = await api.put(`/developer/webhooks/${id}`, webhook);
      return {
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to update webhook',
        success: false,
      };
    }
  },

  deleteWebhook: async (id: number): Promise<ApiResponse<any>> => {
    try {
      await api.delete(`/developer/webhooks/${id}`);
      return {
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to delete webhook',
        success: false,
      };
    }
  },
};

export const favoritesApi = {
  // Get user favorites
  getFavorites: async (): Promise<ApiResponse<TranslationResponse[]>> => {
    try {
      const response = await api.get('/translate/favorites');
      const favorites = response.data?.favorites ?? response.data;
      return {
        data: favorites,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to fetch favorites',
        success: false,
      };
    }
  },

  // Add translation to favorites
  addToFavorites: async (translationId: number): Promise<ApiResponse<any>> => {
    try {
      const response = await api.put(`/translate/favorite/${translationId}`, { is_favorite: true });
      return {
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to add to favorites',
        success: false,
      };
    }
  },

  // Remove translation from favorites
  removeFromFavorites: async (translationId: number): Promise<ApiResponse<any>> => {
    try {
      const response = await api.put(`/translate/favorite/${translationId}`, { is_favorite: false });
      return {
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || error.message || 'Failed to remove from favorites',
        success: false,
      };
    }
  },

  // Add toggleFavorite method for consistency
  toggleFavorite: async (translationId: number, isFavorite: boolean): Promise<ApiResponse<any>> => {
    try {
      const response = await api.put(`/translate/favorite/${translationId}`, { is_favorite: isFavorite });
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
