import { useState, useRef, useCallback, useEffect } from "react";
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { DeepgramTranscriptionData } from "../types";

/**
 * Custom hook for handling speech recognition using Deepgram
 *
 * @param apiKey - Deepgram API key
 * @param onTranscriptionComplete - Optional callback for completed transcription
 */
export function useSpeechRecognition(
    apiKey: string,
    onTranscriptionComplete?: (transcript: string) => void
) {
    const [isListening, setIsListening] = useState<boolean>(false);
    const [transcript, setTranscript] = useState<string>("");
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const deepgramRef = useRef<any>(null);
    const lastTranscriptUpdateRef = useRef<number>(Date.now());
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Function to check for silence
    const checkForSilence = useCallback(() => {
        if (isListening) {
            const now = Date.now();
            const timeSinceLastUpdate = now - lastTranscriptUpdateRef.current;

            // If more than 3 seconds have passed since the last update, stop listening
            if (timeSinceLastUpdate > 3000 && transcript.trim().length > 0) {
                console.log("Silence detected, stopping automatically");
                stopListening();
            }
        }
    }, [isListening, transcript]);

    // Setup silence detection when listening starts
    useEffect(() => {
        if (isListening) {
            // Check every second for silence
            silenceTimerRef.current = setInterval(checkForSilence, 1000);

            // Clear timer when component unmounts or listening stops
            return () => {
                if (silenceTimerRef.current) {
                    clearInterval(silenceTimerRef.current);
                    silenceTimerRef.current = null;
                }
            };
        }
    }, [isListening, checkForSilence]);

    /**
     * Start listening for speech input
     */
    const startListening = useCallback(async () => {
        if (!apiKey) {
            console.error("Deepgram API key is required");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });

            // Initialize Deepgram
            const deepgram = createClient(apiKey);

            // Create a live transcription
            const connection = deepgram.listen.live({
                model: "nova-3",
                smart_format: true,
                interim_results: true,
            });

            deepgramRef.current = connection;

            // Reset the last transcript update time when starting
            lastTranscriptUpdateRef.current = Date.now();

            // Listen for the transcription results
            connection.on(
                LiveTranscriptionEvents.Transcript,
                (data: DeepgramTranscriptionData) => {
                    if (
                        data.is_final &&
                        data.channel.alternatives[0]?.transcript
                    ) {
                        setTranscript(
                            (prev) =>
                                prev +
                                " " +
                                data.channel.alternatives[0].transcript
                        );
                        // Update the timestamp when we receive new transcript content
                        lastTranscriptUpdateRef.current = Date.now();
                    }
                }
            );

            // Listen for connection open
            connection.on(LiveTranscriptionEvents.Open, () => {
                console.log("Connection opened");

                // Set up MediaRecorder to capture audio
                const recorder = new MediaRecorder(stream);
                mediaRecorderRef.current = recorder;

                recorder.ondataavailable = (event) => {
                    if (
                        event.data.size > 0 &&
                        connection.getReadyState() === 1
                    ) {
                        connection.send(event.data);
                    }
                };

                recorder.start(1000);
            });

            // Listen for errors
            connection.on(LiveTranscriptionEvents.Error, (error: Error) => {
                console.error("Deepgram error:", error);
            });

            // Listen for close
            connection.on(LiveTranscriptionEvents.Close, () => {
                console.log("Connection closed");
            });

            setIsListening(true);
        } catch (error) {
            console.error("Error starting microphone:", error);
        }
    }, [apiKey]);

    /**
     * Stop listening and finalize transcription
     */
    const stopListening = useCallback(() => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
        }

        if (deepgramRef.current) {
            deepgramRef.current.finish();
        }

        // Clear silence detection timer
        if (silenceTimerRef.current) {
            clearInterval(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }

        setIsListening(false);

        // Call the callback if provided
        if (onTranscriptionComplete && transcript.trim()) {
            setTimeout(() => {
                onTranscriptionComplete(transcript);
            }, 500); // Short delay to ensure transcript is fully updated
        }
    }, [transcript, onTranscriptionComplete]);

    /**
     * Clear the current transcript
     */
    const clearTranscript = useCallback(() => {
        setTranscript("");
    }, []);

    return {
        isListening,
        transcript,
        startListening,
        stopListening,
        clearTranscript,
        setTranscript,
    };
}
