import React, { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

interface AudioStreamerProps {
    isActive: boolean;
    onTranscription: (text: string) => void;
    onError: (error: string) => void;
    onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
    voiceThreshold?: number; // Add threshold prop
    language?: string; // Add language prop
    onVolumeChange?: (volume: number) => void; // Add volume callback
}

const AudioStreamer: React.FC<AudioStreamerProps> = ({
    isActive,
    onTranscription,
    onError,
    onStatusChange,
    voiceThreshold = 25, // Default threshold value
    language = "en", // Default language
    onVolumeChange // Add volume callback
}) => {
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const websocketRef = useRef<WebSocket | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const intervalRef = useRef<number | null>(null);
    const voiceCheckIntervalRef = useRef<number | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const hasRecentVoiceRef = useRef<boolean>(false);
    const voiceActivityTimestamps = useRef<number[]>([]);
    const lastVoiceActivityRef = useRef<number>(0);
    const silenceTimerRef = useRef<number | null>(null);
    const currentRecordingChunks = useRef<Blob[]>([]);
    const isCurrentlyRecordingVoice = useRef<boolean>(false);
    const [isRecording, setIsRecording] = useState(false);

    // WebSocket URL - adjust based on your backend configuration
    const WS_URL = `ws://localhost:8004/api/v1/ws/realtimestt?language=${encodeURIComponent(language)}`;

    // Function to check if there was voice activity in the last N seconds
    const hasVoiceInLastSeconds = useCallback((seconds: number = 3): boolean => {
        const now = Date.now();
        const cutoff = now - (seconds * 1000);

        // Remove old timestamps
        voiceActivityTimestamps.current = voiceActivityTimestamps.current.filter(timestamp => timestamp > cutoff);

        // Return true if we have any voice activity in the last N seconds
        return voiceActivityTimestamps.current.length > 0;
    }, []);

    // Function to detect voice activity using volume analysis
    const detectVoiceActivity = useCallback((): boolean => {
        if (!analyserRef.current) return false;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Voice activity threshold (configurable)
        const threshold = voiceThreshold;
        const hasVoice = average > threshold;

        // Send volume to parent component for display
        if (onVolumeChange) {
            onVolumeChange(Math.round(average));
        }

        if (hasVoice) {
            // Record timestamp of voice activity
            const now = Date.now();
            voiceActivityTimestamps.current.push(now);
            lastVoiceActivityRef.current = now;

            // Start recording if not already recording voice
            if (!isCurrentlyRecordingVoice.current) {
                console.log('Voice activity detected, starting voice recording session...');
                isCurrentlyRecordingVoice.current = true;
                currentRecordingChunks.current = []; // Reset chunks for new session
            }

            // Clear silence timer if voice is detected
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }
        }

        return hasVoice;
    }, [onVolumeChange, voiceThreshold]);


    // Function to send current recording when speech ends
    const sendCurrentRecording = useCallback(() => {
        if (currentRecordingChunks.current.length === 0 || !websocketRef.current) {
            return;
        }

        const ws = websocketRef.current;
        if (ws.readyState === WebSocket.OPEN) {
            // Combine all recording chunks into one blob
            const combinedBlob = new Blob(currentRecordingChunks.current, {
                type: mediaRecorderRef.current?.mimeType || 'audio/webm'
            });

            combinedBlob.arrayBuffer().then(buffer => {
                console.log(`Sending complete voice recording to WebSocket, buffer size: ${buffer.byteLength}, chunks combined: ${currentRecordingChunks.current.length}`);
                ws.send(buffer);

                // Clear recording chunks after sending
                currentRecordingChunks.current = [];
                isCurrentlyRecordingVoice.current = false;
            });
        }
    }, []);
    // Continuously monitor voice activity
    const startVoiceMonitoring = useCallback(() => {
        if (voiceCheckIntervalRef.current) {
            clearInterval(voiceCheckIntervalRef.current);
        }

        voiceCheckIntervalRef.current = setInterval(() => {
            const hasCurrentVoice = detectVoiceActivity();
            const recentVoice = hasVoiceInLastSeconds(3);
            hasRecentVoiceRef.current = recentVoice;

            // If no current voice activity, start silence timer
            if (!hasCurrentVoice && !silenceTimerRef.current) {
                console.log('No voice detected, starting 1-second silence timer...');
                silenceTimerRef.current = setTimeout(() => {
                    const now = Date.now();
                    const timeSinceLastVoice = now - lastVoiceActivityRef.current;
                    console.log(`1 seconds of silence completed. Time since last voice: ${timeSinceLastVoice}ms`);

                    // Mark end of speech and send recording
                    if (timeSinceLastVoice >= 1000) {
                        console.log('End of speech detected, sending complete recording');

                        // Send current recording if any
                        if (currentRecordingChunks.current.length > 0) {
                            sendCurrentRecording();
                        }

                        // Reset voice activity
                        voiceActivityTimestamps.current = [];
                        hasRecentVoiceRef.current = false;
                    }
                    silenceTimerRef.current = null;
                }, 1000);
            }
        }, 100); // Check every 100ms
    }, [sendCurrentRecording, detectVoiceActivity, hasVoiceInLastSeconds]);

    const stopVoiceMonitoring = useCallback(() => {
        if (voiceCheckIntervalRef.current) {
            clearInterval(voiceCheckIntervalRef.current);
            voiceCheckIntervalRef.current = null;
        }

        // Clear silence timer
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }

        hasRecentVoiceRef.current = false;
        lastVoiceActivityRef.current = 0;
        voiceActivityTimestamps.current = [];

        // Clear current recording
        currentRecordingChunks.current = [];
        isCurrentlyRecordingVoice.current = false;
    }, []);

    const stopRecording = useCallback(() => {
        console.log('Stopping recording...');

        // Clear intervals if they exist
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        stopVoiceMonitoring();

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
                console.log('Audio track stopped');
            });
            streamRef.current = null;
        }

        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        if (websocketRef.current) {
            websocketRef.current.close();
            websocketRef.current = null;
        }

        setIsRecording(false);
        onStatusChange?.('disconnected');
    }, [onStatusChange, stopVoiceMonitoring]);

    const startRecording = useCallback(async () => {
        try {
            console.log(`Starting recording with language: ${language}...`);
            onStatusChange?.('connecting');

            // Get user media
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000,
                }
            });

            streamRef.current = stream;

            // Set up audio analysis for voice detection
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();

            analyser.fftSize = 256;
            source.connect(analyser);

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;

            // Start voice activity monitoring
            startVoiceMonitoring();

            // Initialize WebSocket
            const ws = new WebSocket(WS_URL);
            websocketRef.current = ws;

            ws.onopen = () => {
                console.log('WebSocket connected');
                onStatusChange?.('connected');
                toast.success('Connected to speech recognition service');
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('Received data:', data);

                    if (data.status === 'connected') {
                        console.log('Connection confirmed:', data.message);
                        return;
                    }

                    // Handle transcription response - extract text from the response
                    if (data.text && data.text.trim()) {
                        console.log('Transcribed text:', data.text);
                        onTranscription(data.text.trim());
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                onError('WebSocket connection error');
                onStatusChange?.('error');
            };

            ws.onclose = () => {
                console.log('WebSocket connection closed');
                onStatusChange?.('disconnected');
            };

            // Initialize MediaRecorder with MP3 format for better compatibility
            let mediaRecorder;
            try {
                // Try MP3 first (better compatibility with Groq)
                if (MediaRecorder.isTypeSupported('audio/mp3')) {
                    mediaRecorder = new MediaRecorder(stream, {
                        mimeType: 'audio/mp3'
                    });
                } else if (MediaRecorder.isTypeSupported('audio/wav')) {
                    mediaRecorder = new MediaRecorder(stream, {
                        mimeType: 'audio/wav'
                    });
                } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                    mediaRecorder = new MediaRecorder(stream, {
                        mimeType: 'audio/webm;codecs=opus'
                    });
                } else {
                    // Fallback to default
                    mediaRecorder = new MediaRecorder(stream);
                }
                console.log('MediaRecorder initialized with mimeType:', mediaRecorder.mimeType);
            } catch (error) {
                console.error('Error creating MediaRecorder:', error);
                mediaRecorder = new MediaRecorder(stream);
            }

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);

                    // Check if there was voice activity in the last 3 seconds
                    const hadRecentVoice = hasVoiceInLastSeconds(3);
                    const now = Date.now();
                    const timeSinceLastVoice = now - lastVoiceActivityRef.current;

                    console.log('Audio chunk received, size:', event.data.size, 'hadRecentVoice:', hadRecentVoice, 'timeSinceLastVoice:', timeSinceLastVoice);

                    const minSizeForVoice = 1000; // Reduced threshold for better responsiveness

                    // If we had voice activity and chunk is large enough, add to current recording
                    if (hadRecentVoice && event.data.size > minSizeForVoice && isCurrentlyRecordingVoice.current) {
                        // Add to current recording chunks
                        currentRecordingChunks.current.push(event.data);
                        console.log(`Added chunk to current recording. Total chunks: ${currentRecordingChunks.current.length}`);
                    } else {
                        console.log('Skipping chunk - no recent voice activity, too small, or not in recording session:', {
                            hadRecentVoice,
                            size: event.data.size,
                            minSize: minSizeForVoice,
                            isRecording: isCurrentlyRecordingVoice.current,
                            timeSinceLastVoice
                        });
                    }
                }
            };

            mediaRecorder.onstop = () => {
                console.log('MediaRecorder stopped');

                // Restart recording if still active and not manually stopped
                if (isActive && streamRef.current && intervalRef.current) {
                    console.log('Restarting MediaRecorder for continuous recording...');
                    setTimeout(() => {
                        if (mediaRecorderRef.current && streamRef.current) {
                            try {
                                mediaRecorderRef.current.start();
                            } catch (error) {
                                console.error('Error restarting MediaRecorder:', error);
                            }
                        }
                    }, 100);
                } else {
                    setIsRecording(false);
                }
            };

            mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder error:', event);
                onError('Recording error occurred');
            };

            // Start continuous recording
            mediaRecorder.start();
            setIsRecording(true);

            // Set up interval to restart recording every 1 second to create chunks
            // This ensures we get regular audio chunks for processing with better realtime response
            intervalRef.current = setInterval(() => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                    console.log('Creating new 1-second audio chunk...');
                    mediaRecorderRef.current.stop();
                    // Will restart in onstop event if still active
                }
            }, 1000);

        } catch (error: any) {
            console.error('Failed to start recording:', error);
            onError(`Failed to start recording: ${error.message}`);
            onStatusChange?.('error');
        }
    }, [WS_URL, isActive, language, onTranscription, onError, onStatusChange, startVoiceMonitoring, hasVoiceInLastSeconds]);

    // Effect to handle isActive prop changes
    useEffect(() => {
        if (isActive && !isRecording) {
            startRecording();
        } else if (!isActive && isRecording) {
            stopRecording();
        }
    }, [isActive, isRecording, startRecording, stopRecording]);

    // Effect to restart voice monitoring when threshold changes during active recording
    useEffect(() => {
        if (isActive && isRecording) {
            console.log('Voice threshold changed to:', voiceThreshold, 'restarting voice monitoring...');
            startVoiceMonitoring();
        }
    }, [voiceThreshold, isActive, isRecording, startVoiceMonitoring]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopVoiceMonitoring();
            stopRecording();
        };
    }, [stopRecording, stopVoiceMonitoring]);

    // Don't render anything visible - this is a background service component
    return null;
};

export default AudioStreamer;
