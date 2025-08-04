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
  confidence?: number;
  created_at?: string;
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
