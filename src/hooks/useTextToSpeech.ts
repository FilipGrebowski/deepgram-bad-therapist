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
    }, []);

    /**
     * Convert text to speech and play the resulting audio
     */
    const textToSpeech = useCallback(
        async (text: string) => {
            if (!apiKey || !text.trim()) {
                return Promise.resolve();
            }

            try {
                // Stop any existing audio first
                stopPlayback();

                // Set speaking state
                setIsSpeaking(true);

                // Clear any existing timeout
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }

                // Set a fallback timeout to reset speaking state
                // in case audio fails to load or play
                timeoutRef.current = window.setTimeout(() => {
                    console.log("Audio playback timeout - resetting state");
                    setIsSpeaking(false);
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
                        // Clear the fallback timeout since audio is now playing
                        if (timeoutRef.current) {
                            clearTimeout(timeoutRef.current);
                            timeoutRef.current = null;
                        }
                    };

                    audioRef.current.onended = () => {
                        console.log("Audio ended callback called");
                        setIsSpeaking(false);
                        // Clear references to prevent memory leaks
                        audioRef.current = null;
                    };

                    audioRef.current.onerror = (e) => {
                        console.error("Audio playback error:", e);
                        setIsSpeaking(false);
                        audioRef.current = null;
                    };

                    try {
                        // Setup a safety timeout to ensure speaking state gets reset
                        // even if onended doesn't fire for some reason
                        const approxDuration =
                            Math.max(5, Math.ceil(text.length / 15)) * 1000;
                        timeoutRef.current = window.setTimeout(() => {
                            console.log("Safety timeout reached, forcing stop");
                            setIsSpeaking(false);
                            stopPlayback();
                        }, approxDuration + 3000); // Add buffer time

                        // Start audio playback
                        await audioRef.current.play();
                    } catch (playError) {
                        console.error("Audio play error:", playError);
                        setIsSpeaking(false);
                        audioRef.current = null;
                    }
                } else {
                    console.error("No audio data returned from TTS API");
                    setIsSpeaking(false);
                }

                return Promise.resolve();
            } catch (error) {
                console.error("Text-to-speech error:", error);
                setIsSpeaking(false);
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
    }, [stopPlayback]);

    return {
        isSpeaking,
        textToSpeech,
        stopSpeaking,
    };
}
