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
    const timeoutRef = useRef<number | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const requestInFlightRef = useRef<boolean>(false); // Track if a request is currently in progress

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

    /**
     * Convert text to speech and play the resulting audio
     */
    const textToSpeech = useCallback(
        async (text: string) => {
            // Prevent multiple simultaneous requests
            if (requestInFlightRef.current || !apiKey || !text.trim()) {
                console.log(
                    "Rejecting TTS request - already in progress or invalid params"
                );
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
                    // Create a new audio element each time
                    const audioSrc = `data:${data.format};base64,${data.audio}`;

                    // Clean previous audio if exists
                    stopPlayback();

                    // Create new audio element
                    audioRef.current = new Audio(audioSrc);

                    // Configure audio event handlers
                    audioRef.current.onload = () => {
                        console.log("Audio loaded");
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
        [apiKey, selectedVoice, onPlaybackStarted, stopPlayback]
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
