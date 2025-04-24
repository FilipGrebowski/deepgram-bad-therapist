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

    // Cache size increased to store more responses
    const MAX_CACHE_SIZE = 20;

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
     * Convert text to speech and prepare the resulting audio
     * Note: This version doesn't automatically play the audio - it just prepares it
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

                // Clear any existing timeout
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }

                // Set a fallback timeout to reset request state
                // in case audio fails to load or play
                timeoutRef.current = window.setTimeout(() => {
                    console.log("Audio preparation timeout - resetting state");
                    requestInFlightRef.current = false;
                }, 10000); // 10 second fallback

                // Generate a cache key based on text and voice
                const voiceId = selectedVoice || "default";
                const cacheKey = `${text}_${voiceId}`;

                // Check if we already have this audio in our cache
                if (audioCache.current.has(cacheKey)) {
                    console.log("Using cached audio");
                    const cachedAudio = audioCache.current.get(cacheKey);

                    if (cachedAudio) {
                        // Return success - we'll play this later when requested
                        if (timeoutRef.current) {
                            clearTimeout(timeoutRef.current);
                            timeoutRef.current = null;
                        }
                        requestInFlightRef.current = false;
                        return Promise.resolve();
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
                        if (audioCache.current.size > MAX_CACHE_SIZE) {
                            // Remove the first entry (oldest) using iterators
                            const firstKey = audioCache.current
                                .keys()
                                .next().value;
                            audioCache.current.delete(firstKey);
                        }

                        // Audio is prepared and cached, but not played yet
                        if (timeoutRef.current) {
                            clearTimeout(timeoutRef.current);
                            timeoutRef.current = null;
                        }
                        requestInFlightRef.current = false;
                        return Promise.resolve();
                    } catch (processingError) {
                        console.error(
                            "Audio processing error:",
                            processingError
                        );
                        requestInFlightRef.current = false;
                        return Promise.resolve();
                    }
                } else {
                    console.error("No audio data returned from TTS API");
                    requestInFlightRef.current = false;
                    return Promise.resolve();
                }
            } catch (error) {
                console.error("Text-to-speech error:", error);
                requestInFlightRef.current = false;
                return Promise.reject(error);
            }
        },
        [apiKey, selectedVoice, stopPlayback]
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

    // Add a new function to play the cached audio
    /**
     * Play audio that has been previously prepared and cached
     */
    const playPreparedAudio = useCallback(
        async (text: string) => {
            if (!text.trim()) {
                return Promise.resolve(false);
            }

            // Generate cache key in the same way as textToSpeech
            const voiceId = selectedVoice || "default";
            const cacheKey = `${text}_${voiceId}`;

            // Check if we have this audio in our cache
            if (!audioCache.current.has(cacheKey)) {
                console.log("Audio not found in cache, preparing it now");
                await textToSpeech(text);
            }

            // Now try to play from cache
            if (audioCache.current.has(cacheKey)) {
                try {
                    // Stop any existing audio first
                    stopPlayback();

                    // Set speaking state
                    setIsSpeaking(true);
                    console.log("Setting isSpeaking to TRUE");

                    const cachedAudio = audioCache.current.get(cacheKey);
                    if (cachedAudio) {
                        // Use the enhanced audio player for cached audio
                        try {
                            // Create a new AudioContext if we don't have one
                            if (!audioContextRef.current) {
                                // Use modern AudioContext API with fallbacks
                                const AudioContextClass =
                                    window.AudioContext ||
                                    (window as any).webkitAudioContext;
                                audioContextRef.current = new AudioContextClass(
                                    {
                                        // Higher sample rate for better quality
                                        sampleRate: 48000,
                                        latencyHint: "interactive",
                                    }
                                );
                            }

                            // Resume the audio context if it's suspended
                            if (audioContextRef.current.state === "suspended") {
                                await audioContextRef.current.resume();
                            }

                            // Decode the audio data
                            audioBufferRef.current =
                                await audioContextRef.current.decodeAudioData(
                                    cachedAudio.slice(0)
                                );

                            // Create a source node
                            const source =
                                audioContextRef.current.createBufferSource();
                            source.buffer = audioBufferRef.current;

                            // Create a gain node for volume control
                            const gainNode =
                                audioContextRef.current.createGain();
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
                            const filter =
                                audioContextRef.current.createBiquadFilter();
                            filter.type = "highpass";
                            filter.frequency.value = 100; // Filter out very low frequencies

                            // Connect the nodes
                            source.connect(filter);
                            filter.connect(compressor);
                            compressor.connect(gainNode);
                            gainNode.connect(
                                audioContextRef.current.destination
                            );

                            // Set up callbacks
                            source.onended = () => {
                                console.log("Enhanced audio playback ended");
                                setIsSpeaking(false);
                                requestInFlightRef.current = false;
                            };

                            // Start playback
                            source.start(0);
                            console.log("Enhanced audio playback started");

                            // Call the playback started callback if provided
                            if (onPlaybackStarted) {
                                onPlaybackStarted();
                            }

                            // Set up a safety timeout based on the audio duration
                            const duration = audioBufferRef.current.duration;
                            const safetyTimeout =
                                Math.ceil(duration * 1000) + 2000; // Add 2 seconds buffer

                            if (timeoutRef.current) {
                                clearTimeout(timeoutRef.current);
                            }

                            timeoutRef.current = window.setTimeout(() => {
                                console.log(
                                    "Safety timeout reached, forcing stop"
                                );
                                setIsSpeaking(false);
                                requestInFlightRef.current = false;
                                stopPlayback();
                            }, safetyTimeout);

                            return true;
                        } catch (error) {
                            console.error(
                                "Enhanced audio playback error:",
                                error
                            );
                            setIsSpeaking(false);
                            return false;
                        }
                    }
                } catch (error) {
                    console.error("Error playing cached audio:", error);
                    setIsSpeaking(false);
                    return false;
                }
            }

            return false;
        },
        [selectedVoice, stopPlayback, textToSpeech, onPlaybackStarted]
    );

    return {
        isSpeaking,
        textToSpeech,
        playPreparedAudio,
        stopSpeaking,
    };
}
