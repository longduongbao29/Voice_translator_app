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
  engine?: string; // Support custom engines like 'custom_123'
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

export interface Text2SpeechRequest {
  text: string;
  language_code?: string;
  voice_id?: string;
  output_format?: string;
  model_name?: string;
}

export interface Voice {
  id: string;
  name: string;
  gender?: 'male' | 'female';
  language?: string;
}

export interface ElevenLabsSettings {
  id?: number;
  user_id?: number;
  model_id?: string;
  voice_id?: string;
  voice_name?: string;
  voice_settings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
  cloned_voices?: ClonedVoice[];
  created_at?: string;
  updated_at?: string;
}

export interface ClonedVoice {
  voice_id: string;
  name: string;
  description?: string;
  created_at?: string;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
}

export interface ElevenLabsModel {
  model_id: string;
  name: string;
  description: string;
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
  preferred_speech2text?: string;
  custom_endpoints_enabled?: boolean;
  webhooks_enabled?: boolean;
}

export interface UserSettings {
  id?: number;
  user_id?: number;
  src_lang?: string;
  trg_lang?: string;
  translate_api?: string;
  stt_api?: string;
  text2speech_api?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CustomEndpoint {
  id?: number;
  name: string;
  endpoint_type: 'speech2text' | 'translation' | 'text2speech';
  api_url: string;
  api_key?: string;
  meta_data?: Record<string, any>;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WebhookIntegration {
  id?: number;
  name: string;
  platform: 'slack' | 'discord' | 'zalo' | 'custom';
  meta_data?: Record<string, any>; // Stores webhook_url, secret_key, event_types, config and other platform-specific data
  created_at?: string;
  updated_at?: string;
}

