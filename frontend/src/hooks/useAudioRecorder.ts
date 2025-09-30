import { useState, useRef, useCallback } from 'react';

interface UseAudioRecorderReturn {
    isRecording: boolean;
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<Blob | null>;
    error: string | null;
    // normalized audio level in range 0..1
    level: number;
}

export const useAudioRecorder = (): UseAudioRecorderReturn => {
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [level, setLevel] = useState<number>(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const rafRef = useRef<number | null>(null);

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

            // set up WebAudio analyser to measure level
            try {
                const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
                if (AudioContextClass) {
                    const audioCtx = new AudioContextClass();
                    audioContextRef.current = audioCtx;
                    const source = audioCtx.createMediaStreamSource(stream);
                    const analyser = audioCtx.createAnalyser();
                    analyser.fftSize = 256;
                    analyser.smoothingTimeConstant = 0.3;
                    source.connect(analyser);
                    analyserRef.current = analyser;

                    const dataArray = new Uint8Array(analyser.frequencyBinCount);
                    const updateLevel = () => {
                        try {
                            analyser.getByteTimeDomainData(dataArray);
                            let sum = 0;
                            for (let i = 0; i < dataArray.length; i++) {
                                const v = (dataArray[i] - 128) / 128; // -1..1
                                sum += v * v;
                            }
                            const rms = Math.sqrt(sum / dataArray.length);
                            const normalized = Math.min(1, rms * 1.5);
                            setLevel(normalized);
                        } catch (e) {
                            // ignore analyser errors
                        }
                        rafRef.current = requestAnimationFrame(updateLevel);
                    };
                    rafRef.current = requestAnimationFrame(updateLevel);
                }
            } catch (e) {
                // analyser not available
            }

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

            const selectedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));

            // If no specific mime type is supported, let the browser choose by omitting mimeType
            const mediaRecorder = selectedMimeType
                ? new MediaRecorder(stream, { mimeType: selectedMimeType })
                : new MediaRecorder(stream);
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
            const recorder = mediaRecorderRef.current;

            if (!recorder) {
                // No recorder - resolve null immediately
                resolve(null);
                return;
            }

            let settled = false;
            const cleanupAndResolve = (blob: Blob | null) => {
                if (settled) return;
                settled = true;

                // Stop all tracks
                try {
                    streamRef.current?.getTracks().forEach(track => track.stop());
                } catch (e) {
                    // ignore
                }

                setIsRecording(false);
                mediaRecorderRef.current = null;
                streamRef.current = null;
                audioChunksRef.current = [];

                // tear down analyser and audio context
                try {
                    if (rafRef.current) {
                        cancelAnimationFrame(rafRef.current);
                        rafRef.current = null;
                    }
                    if (analyserRef.current) {
                        analyserRef.current.disconnect();
                        analyserRef.current = null;
                    }
                    if (audioContextRef.current) {
                        try { audioContextRef.current.close(); } catch { };
                        audioContextRef.current = null;
                    }
                    setLevel(0);
                } catch (e) {
                    // ignore
                }

                resolve(blob);
            };

            // Assign onstop before calling stop to avoid race conditions
            recorder.onstop = () => {
                try {
                    const mimeType = recorder.mimeType || 'audio/webm';
                    if (audioChunksRef.current.length === 0) {
                        setError('No audio data recorded');
                        cleanupAndResolve(null);
                        return;
                    }

                    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                    cleanupAndResolve(audioBlob);
                } catch (err) {
                    console.error('Error in onstop handler:', err);
                    setError(`Error finalizing recording: ${err}`);
                    cleanupAndResolve(null);
                }
            };

            // Some browsers may not call onstop reliably; add a timeout as a fallback
            // const stopTimeout = setTimeout(() => {
            //     if (!settled) {
            //         console.warn('stopRecording timeout reached, resolving with null');
            //         cleanupAndResolve(null);
            //     }
            // }, 5000);

            try {
                if (recorder.state === 'recording') {
                    recorder.stop();
                } else {
                    // If not recording, call onstop manually to finalize
                    recorder.onstop?.(new Event('manualStop') as any);
                }
            } catch (err) {
                console.error('Error stopping recorder:', err);
                setError(`Error stopping recorder: ${err}`);
                cleanupAndResolve(null);
            }

            // clear timeout when promise settles
            // const originalResolve = resolve;
            // const wrappedResolve = (value: Blob | null) => {
            //     clearTimeout(stopTimeout);
            //     originalResolve(value);
            // };
            // Note: we cannot replace resolve inside the Promise scope easily; but cleanupAndResolve already calls resolve and clears tracks.
        });
    }, []);

    return {
        isRecording,
        startRecording,
        stopRecording,
        error
        , level
    };
};
