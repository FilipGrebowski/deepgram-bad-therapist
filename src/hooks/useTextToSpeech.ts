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

    // Initialize audio element
    useEffect(() => {
        audioRef.current = new Audio();
        audioRef.current.onended = () => {
            setIsSpeaking(false);
        };

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }

            // Clean up any remaining timeouts
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
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
                setIsSpeaking(true);

                // Clear any existing timeout
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }

                // Set a fallback timeout to start typing animation
                // even if audio fails to play or takes too long
                timeoutRef.current = window.setTimeout(() => {
                    console.log(
                        "Audio playback timeout - starting typing animation anyway"
                    );
                    if (onPlaybackStarted) {
                        onPlaybackStarted();
                    }
                }, 2000); // 2 second fallback

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
                    // We've already started the typing animation, so just continue
                    return Promise.resolve();
                }

                const data = await response.json();

                if (data.audio) {
                    // Stop any existing audio
                    if (audioRef.current) {
                        audioRef.current.pause();
                    }

                    // Create audio blob and play
                    const audioSrc = `data:${data.format};base64,${data.audio}`;
                    audioRef.current = new Audio(audioSrc);

                    // Configure audio event handlers
                    audioRef.current.onplay = () => {
                        // Clear the fallback timeout since audio is now playing
                        if (timeoutRef.current) {
                            clearTimeout(timeoutRef.current);
                            timeoutRef.current = null;
                        }
                    };

                    audioRef.current.onended = () => setIsSpeaking(false);
                    audioRef.current.onerror = (e) => {
                        console.error("Audio playback error:", e);
                        setIsSpeaking(false);
                    };

                    try {
                        await audioRef.current.play();
                    } catch (playError) {
                        console.error("Audio play error:", playError);
                        // We've already started the typing animation, so just continue
                    }
                } else {
                    console.error("No audio data returned from TTS API");
                }

                return Promise.resolve();
            } catch (error) {
                console.error("Text-to-speech error:", error);
                setIsSpeaking(false);
                return Promise.reject(error);
            }
        },
        [apiKey, selectedVoice, onPlaybackStarted]
    );

    /**
     * Stop the current audio playback
     */
    const stopSpeaking = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsSpeaking(false);
        }

        // Clear any pending timeouts
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    return {
        isSpeaking,
        textToSpeech,
        stopSpeaking,
    };
}
