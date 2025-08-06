import { useState, useRef, useCallback } from 'react';

interface UseAudioRecorderReturn {
    isRecording: boolean;
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<Blob | null>;
    error: string | null;
}

export const useAudioRecorder = (): UseAudioRecorderReturn => {
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

    const startRecording = useCallback(async () => {
        try {
            setError(null);

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                }
            });
            streamRef.current = stream;

            // Prioritize WebM format since the backend is expecting this
            const mimeTypes = [
                'audio/webm;codecs=opus', // Best option for voice
                'audio/webm',             // Fallback WebM
                'audio/mp4',              // Less ideal options
                'audio/ogg;codecs=opus',
                'audio/wav'
            ];

            console.log("Checking supported audio formats...");
            mimeTypes.forEach(type => {
                console.log(`${type}: ${MediaRecorder.isTypeSupported(type) ? 'supported' : 'not supported'}`);
            });

            const selectedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';

            if (!selectedMimeType) {
                throw new Error('No supported audio format found for recording.');
            }

            console.log(`Selected recording format: ${selectedMimeType}`);

            const mediaRecorder = new MediaRecorder(stream, { mimeType: selectedMimeType });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);

        } catch (err: any) {
            setError(`Failed to start recording: ${err.message}`);
            setIsRecording(false);
        }
    }, []);

    const stopRecording = useCallback(async (): Promise<Blob | null> => {
        return new Promise((resolve) => {
            if (!mediaRecorderRef.current) {
                resolve(null);
                return;
            }

            mediaRecorderRef.current.onstop = () => {
                try {
                    const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
                    console.log(`Creating blob with type: ${mimeType}`);
                    console.log(`Audio chunks: ${audioChunksRef.current.length}`);

                    if (audioChunksRef.current.length === 0) {
                        setError('No audio data recorded');
                        resolve(null);
                        return;
                    }

                    // Create the blob with the correct mime type
                    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                    console.log(`Blob created: ${audioBlob.size} bytes, type: ${audioBlob.type}`);

                    // Stop all tracks
                    streamRef.current?.getTracks().forEach(track => {
                        track.stop();
                        console.log(`Stopped track: ${track.kind}`);
                    });

                    // Reset state
                    setIsRecording(false);
                    mediaRecorderRef.current = null;
                    audioChunksRef.current = [];
                    streamRef.current = null;

                    resolve(audioBlob);
                } catch (error) {
                    console.error('Error in onstop handler:', error);
                    setError(`Error finalizing recording: ${error}`);
                    resolve(null);
                }
            };

            if (mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
        });
    }, []);

    return {
        isRecording,
        startRecording,
        stopRecording,
        error
    };
};
