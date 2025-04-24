import { useState, useRef, useEffect, useCallback } from "react";

// API URL that works in both development and production
const API_URL =
    window.location.hostname === "localhost" ? "http://localhost:3002" : "";

/**
 * Custom hook for text-to-speech functionality
 *
 * @param apiKey - Deepgram API key
 * @param selectedVoice - Selected voice ID
 * @param onPlaybackStarted - Optional callback for when audio playback begins
 */
export function useTextToSpeech(
    apiKey: string,
    selectedVoice: string,
    onPlaybackStarted?: () => void
) {
    const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioSourceRef = useRef<string | null>(null);
    const timeoutRef = useRef<number | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioBufferRef = useRef<AudioBuffer | null>(null);
    const requestInFlightRef = useRef<boolean>(false); // Track if a request is currently in progress
    const audioCache = useRef<Map<string, ArrayBuffer>>(new Map());

    // Initialize audio element
    useEffect(() => {
        // Clean up function to ensure we properly release audio resources
        return () => {
            stopPlayback();

            // Clean up any remaining timeouts
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, []);

    // Helper to stop any ongoing playback
    const stopPlayback = useCallback(() => {
        // Stop any existing audio
        if (audioRef.current) {
            try {
                // Properly end the current audio playback
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                audioRef.current.src = "";

                // Remove event listeners
                audioRef.current.onplay = null;
                audioRef.current.onended = null;
                audioRef.current.onerror = null;

                // Cleanup audio context if exists
                if (
                    audioContextRef.current &&
                    audioContextRef.current.state !== "closed"
                ) {
                    try {
                        audioContextRef.current.close();
                    } catch (e) {
                        console.error("Error closing audio context:", e);
                    }
                    audioContextRef.current = null;
                }
            } catch (e) {
                console.error("Error stopping audio playback:", e);
            }
        }

        // Reset the request in flight flag
        requestInFlightRef.current = false;
    }, []);

    const playEnhancedAudio = useCallback(
        async (audioArrayBuffer: ArrayBuffer) => {
            try {
                // Create a new AudioContext if we don't have one
                if (!audioContextRef.current) {
                    // Use modern AudioContext API with fallbacks
                    const AudioContextClass =
                        window.AudioContext ||
                        (window as any).webkitAudioContext;
                    audioContextRef.current = new AudioContextClass({
                        // Higher sample rate for better quality
                        sampleRate: 48000,
                        latencyHint: "interactive",
                    });
                }

                // Resume the audio context if it's suspended
                if (audioContextRef.current.state === "suspended") {
                    await audioContextRef.current.resume();
                }

                // Decode the audio data
                audioBufferRef.current =
                    await audioContextRef.current.decodeAudioData(
                        audioArrayBuffer
                    );

                // Create a source node
                const source = audioContextRef.current.createBufferSource();
                source.buffer = audioBufferRef.current;

                // Create a gain node for volume control
                const gainNode = audioContextRef.current.createGain();
                gainNode.gain.value = 1.0; // Normal volume

                // Create a compressor for better audio quality
                const compressor =
                    audioContextRef.current.createDynamicsCompressor();
                compressor.threshold.value = -24;
                compressor.knee.value = 30;
                compressor.ratio.value = 12;
                compressor.attack.value = 0.003;
                compressor.release.value = 0.25;

                // Create a biquad filter for better clarity
                const filter = audioContextRef.current.createBiquadFilter();
                filter.type = "highpass";
                filter.frequency.value = 100; // Filter out very low frequencies

                // Connect the nodes
                source.connect(filter);
                filter.connect(compressor);
                compressor.connect(gainNode);
                gainNode.connect(audioContextRef.current.destination);

                // Set up callbacks
                source.onended = () => {
                    console.log("Enhanced audio playback ended");
                    setIsSpeaking(false);
                    requestInFlightRef.current = false;
                };

                // Start playback
                source.start(0);
                console.log("Enhanced audio playback started");

                // Set up a safety timeout based on the audio duration
                const duration = audioBufferRef.current.duration;
                const safetyTimeout = Math.ceil(duration * 1000) + 2000; // Add 2 seconds buffer

                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }

                timeoutRef.current = window.setTimeout(() => {
                    console.log("Safety timeout reached, forcing stop");
                    setIsSpeaking(false);
                    requestInFlightRef.current = false;
                    stopPlayback();
                }, safetyTimeout);

                return true;
            } catch (error) {
                console.error("Enhanced audio playback error:", error);
                return false;
            }
        },
        [stopPlayback]
    );

    /**
     * Convert text to speech and play the resulting audio
     */
    const textToSpeech = useCallback(
        async (text: string) => {
            // Prevent multiple simultaneous requests
            if (requestInFlightRef.current || !text.trim()) {
                console.log(
                    "Rejecting TTS request - already in progress or invalid params"
                );
                return Promise.resolve();
            }

            // Make sure we have an API key or are using environment-provided key
            if (!apiKey && apiKey !== "ENVIRONMENT_PROVIDED") {
                console.error("No Deepgram API key provided");
                return Promise.resolve();
            }

            try {
                // Mark that we have a request in flight
                requestInFlightRef.current = true;

                // Stop any existing audio first
                stopPlayback();

                // Set speaking state
                setIsSpeaking(true);
                console.log("Setting isSpeaking to TRUE");

                // Clear any existing timeout
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }

                // Set a fallback timeout to reset speaking state
                // in case audio fails to load or play
                timeoutRef.current = window.setTimeout(() => {
                    console.log("Audio playback timeout - resetting state");
                    setIsSpeaking(false);
                    requestInFlightRef.current = false;
                    if (onPlaybackStarted) {
                        onPlaybackStarted();
                    }
                }, 10000); // 10 second fallback

                // Start the typing animation immediately for better responsiveness
                if (onPlaybackStarted) {
                    onPlaybackStarted();
                }

                // Generate a cache key based on text and voice
                const voiceId = selectedVoice || "default";
                const cacheKey = `${text}_${voiceId}`;

                // Check if we already have this audio in our cache
                if (audioCache.current.has(cacheKey)) {
                    console.log("Using cached audio");
                    const cachedAudio = audioCache.current.get(cacheKey);
                    if (cachedAudio) {
                        // Use the enhanced audio player for cached audio
                        const playbackSuccess = await playEnhancedAudio(
                            cachedAudio.slice(0)
                        );

                        if (playbackSuccess) {
                            return Promise.resolve();
                        }
                        // If enhanced playback fails, continue with regular playback as a fallback
                    }
                }

                const response = await fetch(`${API_URL}/api/tts`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        text,
                        apiKey,
                        voice: selectedVoice,
                    }),
                });

                if (!response.ok) {
                    console.error("TTS request failed:", response.statusText);
                    setIsSpeaking(false);
                    console.log("Setting isSpeaking to FALSE (request failed)");
                    requestInFlightRef.current = false;
                    return Promise.resolve();
                }

                const data = await response.json();

                if (data.audio) {
                    try {
                        // Convert base64 to ArrayBuffer
                        const binaryString = atob(data.audio);
                        const bytes = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }
                        const audioArrayBuffer = bytes.buffer;

                        // Store in cache for future use
                        audioCache.current.set(
                            cacheKey,
                            audioArrayBuffer.slice(0)
                        );

                        // Cap the cache size to prevent memory issues
                        if (audioCache.current.size > 10) {
                            // Remove the first entry (oldest) using iterators
                            const firstKey = audioCache.current
                                .keys()
                                .next().value;
                            audioCache.current.delete(firstKey);
                        }

                        // Try to play using enhanced audio processing
                        const playbackSuccess = await playEnhancedAudio(
                            audioArrayBuffer
                        );

                        if (playbackSuccess) {
                            return Promise.resolve();
                        }

                        // Fallback to traditional Audio element if WebAudio API fails
                        console.log(
                            "Falling back to traditional audio playback"
                        );
                    } catch (processingError) {
                        console.error(
                            "Audio processing error:",
                            processingError
                        );
                        // Continue to traditional playback as fallback
                    }

                    // Create a new audio element as fallback
                    const audioSrc = `data:${data.format};base64,${data.audio}`;
                    audioSourceRef.current = audioSrc;

                    // Clean previous audio if exists
                    stopPlayback();

                    // Create new audio element
                    audioRef.current = new Audio(audioSrc);

                    // Configure audio event handlers
                    audioRef.current.oncanplaythrough = () => {
                        console.log("Audio can play through without buffering");
                    };

                    audioRef.current.onplay = () => {
                        console.log("Audio playback started");
                        // Make sure isSpeaking is still true
                        setIsSpeaking(true);
                        // Clear the fallback timeout since audio is now playing
                        if (timeoutRef.current) {
                            clearTimeout(timeoutRef.current);
                            timeoutRef.current = null;
                        }
                    };

                    audioRef.current.onended = () => {
                        console.log(
                            "Audio ended callback called - setting isSpeaking to FALSE"
                        );
                        setIsSpeaking(false);
                        requestInFlightRef.current = false;
                        // Clear references to prevent memory leaks
                        audioRef.current = null;
                    };

                    audioRef.current.onerror = (e) => {
                        console.error("Audio playback error:", e);
                        console.log(
                            "Setting isSpeaking to FALSE (playback error)"
                        );
                        setIsSpeaking(false);
                        requestInFlightRef.current = false;
                        audioRef.current = null;
                    };

                    // Preload the audio
                    audioRef.current.preload = "auto";

                    // Keep track if we've already started playing
                    let hasStartedPlaying = false;

                    try {
                        // Make sure we're still in speaking state before playing
                        setIsSpeaking(true);

                        // Setup a safety timeout to ensure speaking state gets reset
                        // even if onended doesn't fire for some reason
                        const approxDuration =
                            Math.max(5, Math.ceil(text.length / 15)) * 1000;
                        timeoutRef.current = window.setTimeout(() => {
                            console.log("Safety timeout reached, forcing stop");
                            setIsSpeaking(false);
                            requestInFlightRef.current = false;
                            stopPlayback();
                        }, approxDuration + 3000); // Add buffer time

                        // Start audio playback
                        await audioRef.current.play();
                        hasStartedPlaying = true;
                    } catch (playError) {
                        console.error("Audio play error:", playError);
                        if (!hasStartedPlaying) {
                            console.log(
                                "Setting isSpeaking to FALSE (play failed)"
                            );
                            setIsSpeaking(false);
                            requestInFlightRef.current = false;
                            audioRef.current = null;
                        }
                    }
                } else {
                    console.error("No audio data returned from TTS API");
                    console.log("Setting isSpeaking to FALSE (no audio data)");
                    setIsSpeaking(false);
                    requestInFlightRef.current = false;
                }

                return Promise.resolve();
            } catch (error) {
                console.error("Text-to-speech error:", error);
                console.log("Setting isSpeaking to FALSE (general error)");
                setIsSpeaking(false);
                requestInFlightRef.current = false;
                return Promise.reject(error);
            }
        },
        [
            apiKey,
            selectedVoice,
            onPlaybackStarted,
            stopPlayback,
            playEnhancedAudio,
        ]
    );

    /**
     * Stop the current audio playback
     */
    const stopSpeaking = useCallback(() => {
        console.log("Stop speaking called");

        // Force isSpeaking to false immediately
        setIsSpeaking(false);

        // Stop any playback
        stopPlayback();

        // Clear any pending timeouts
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        // Reset the request in flight flag
        requestInFlightRef.current = false;
    }, [stopPlayback]);

    return {
        isSpeaking,
        textToSpeech,
        stopSpeaking,
    };
}
