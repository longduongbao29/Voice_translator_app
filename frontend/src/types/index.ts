export interface Language {
  code: string;
  name: string;
  native_name: string;
  supports_offline: boolean;
}

export interface TranslationRequest {
  text: string;
  source_language: string;
  target_language: string;
  engine?: 'google' | 'openai' | 'local';
}

export interface TranslationResponse {
  id?: number;
  source_text: string;
  translated_text: string;
  source_language: string;
  target_language: string;
  translation_engine: string;
  is_favorite?: boolean;
  confidence?: number;
  created_at?: string;
  user_id?: number;

}

export interface LanguageDetectionResponse {
  detected_language: string;
  confidence: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface VoiceRecognitionState {
  isListening: boolean;
  transcript: string;
  confidence: number;
  error?: string;
}

export interface SpeechSynthesisState {
  isSpeaking: boolean;
  isPaused: boolean;
  error?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  avatar?: string;
  preferences?: UserPreferences;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  avatar?: string;
  is_active: boolean;
  created_at: string;
}

export interface UserPreferences {
  default_source_language?: string;
  default_target_language?: string;
  preferred_engine?: string;
  theme?: string;
  auto_detect?: boolean;
}

