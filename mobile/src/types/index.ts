export interface Language {
    code: string;
    name: string;
}

export interface TranslationResponse {
    translatedText: string;
    from: string;
    to: string;
}

export interface AudioRecorderState {
    isRecording: boolean;
    audioBlob: Blob | null;
    audioURL: string | null;
}
