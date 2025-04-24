import { useEffect, useRef, useState } from "react";
import "./App.css";

// Import components
import { VoiceVisualizer } from "./components/VoiceVisualizer";
import { SpeechControls } from "./components/SpeechControls";
import { ApiKeyForm } from "./components/ApiKeyForm";
import { VoiceSelector } from "./components/VoiceSelector";
import { Message } from "./components/Message";

// Import hooks
import { useApiKeys } from "./hooks/useApiKeys";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";
import { useTextToSpeech } from "./hooks/useTextToSpeech";
import { useClaudeApi } from "./hooks/useClaudeApi";
import { useVoiceModels } from "./hooks/useVoiceModels";
import { Message as MessageType } from "./types";

/**
 * Main application component
 */
function App() {
    // API keys management
    const {
        deepgramApiKey,
        claudeApiKey,
        setDeepgramApiKey,
        setClaudeApiKey,
        keysSubmitted,
        isLoadingKeys,
        handleSubmitKeys,
    } = useApiKeys();

    // Voice models management
    const { availableVoices, selectedVoice, setSelectedVoice } =
        useVoiceModels();

    // Claude API communication
    const {
        isProcessing,
        messages: apiMessages,
        processTranscript,
        clearConversation,
    } = useClaudeApi(claudeApiKey);

    // State to manage visible messages with thinking state
    const [visibleMessages, setVisibleMessages] = useState<MessageType[]>([]);

    // Track which message is currently playing
    const [activePlayingIndex, setActivePlayingIndex] = useState<number | null>(
        null
    );

    // Track if therapist is thinking (response received but TTS not started)
    const [isTherapistThinking, setIsTherapistThinking] = useState(false);

    // Speech-to-text functionality
    const {
        isListening,
        transcript,
        startListening: originalStartListening,
        stopListening: originalStopListening,
        clearTranscript,
        setTranscript,
    } = useSpeechRecognition(deepgramApiKey, (finalTranscript) => {
        // Auto-process transcript when speech recognition stops
        if (finalTranscript.trim()) {
            processTranscript(finalTranscript);
        }
    });

    // Custom wrapper for stopListening that clears the transcript after processing
    const stopListening = () => {
        originalStopListening();
        // No need to keep transcript visible since it will appear as a message
        setTimeout(() => clearTranscript(), 500);
    };

    // Text-to-speech functionality with extension to track active message
    const {
        isSpeaking,
        textToSpeech: originalTextToSpeech,
        playPreparedAudio,
        stopSpeaking: originalStopSpeaking,
    } = useTextToSpeech(deepgramApiKey, selectedVoice, () => {
        // This callback is called when playback actually starts
        setIsTherapistThinking(false);
    });

    // Wrapper for textToSpeech that tracks which message is playing
    const textToSpeech = (text: string, messageId: number) => {
        setActivePlayingIndex(messageId);
        return playPreparedAudio(text);
    };

    // Wrapper for stopSpeaking that clears the active message
    const stopSpeaking = () => {
        setActivePlayingIndex(null);
        originalStopSpeaking();
    };

    // Reset active playing index when speech stops
    useEffect(() => {
        if (!isSpeaking && activePlayingIndex !== null) {
            console.log("Speech stopped, clearing active playing index");
            setActivePlayingIndex(null);
        }
    }, [isSpeaking]);

    // Track if we're already processing a TTS request
    const processingTtsRef = useRef(false);
    const lastProcessedMessageRef = useRef<string | null>(null);

    // Update visible messages when API messages change
    useEffect(() => {
        // If a new message was added and it's from the assistant
        if (
            apiMessages.length > visibleMessages.length &&
            apiMessages[apiMessages.length - 1].role === "assistant"
        ) {
            // Add user message immediately
            if (
                apiMessages.length >= 2 &&
                apiMessages[apiMessages.length - 2].role === "user" &&
                (visibleMessages.length === 0 ||
                    visibleMessages[visibleMessages.length - 1].role !==
                        "user" ||
                    visibleMessages[visibleMessages.length - 1].content !==
                        apiMessages[apiMessages.length - 2].content)
            ) {
                setVisibleMessages((prev) => [
                    ...prev,
                    apiMessages[apiMessages.length - 2],
                ]);
            }

            // Show thinking state for therapist
            setIsTherapistThinking(true);
        } else if (
            apiMessages.length > 0 &&
            apiMessages[apiMessages.length - 1].role === "user"
        ) {
            // Always show user messages immediately
            setVisibleMessages(apiMessages);
        }
    }, [apiMessages]);

    // Add a ref for the conversation container
    const conversationRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to top when messages change
    useEffect(() => {
        if (conversationRef.current) {
            conversationRef.current.scrollTop = 0;
        }
    }, [visibleMessages, isTherapistThinking]);

    // Synchronize audio playback with text display
    useEffect(() => {
        const lastMessage = apiMessages[apiMessages.length - 1];
        const lastMessageIndex = apiMessages.length - 1;

        // Only process if:
        // 1. It's an assistant message with content
        // 2. We're not already processing a TTS request
        // 3. We haven't already processed this exact message
        if (
            lastMessage?.role === "assistant" &&
            lastMessage.content &&
            !processingTtsRef.current &&
            lastMessage.content !== lastProcessedMessageRef.current
        ) {
            // Store message to prevent reprocessing
            lastProcessedMessageRef.current = lastMessage.content;
            processingTtsRef.current = true;

            // Show the thinking state immediately
            setIsTherapistThinking(true);

            // Start preparing the TTS request in the background
            originalTextToSpeech(lastMessage.content)
                .then(() => {
                    // Once TTS is prepared, show the message and play audio immediately
                    setIsTherapistThinking(false);
                    setVisibleMessages(apiMessages);
                    // Play audio automatically once ready
                    playPreparedAudio(lastMessage.content).then(() => {
                        setActivePlayingIndex(lastMessageIndex);
                    });
                    processingTtsRef.current = false;
                })
                .catch((error) => {
                    console.error("TTS preparation error:", error);
                    // If TTS fails, still show the message
                    setIsTherapistThinking(false);
                    setVisibleMessages(apiMessages);
                    processingTtsRef.current = false;
                });
        }
    }, [apiMessages, originalTextToSpeech, playPreparedAudio]);

    // When speech starts, update visible messages to include the assistant message
    useEffect(() => {
        if (isSpeaking && activePlayingIndex !== null) {
            // Get the complete message that's being spoken
            const speakingMessage = apiMessages[activePlayingIndex];

            // Update visible messages to include this message
            if (speakingMessage && speakingMessage.role === "assistant") {
                setVisibleMessages(apiMessages);
            }
        }
    }, [isSpeaking, activePlayingIndex, apiMessages]);

    // Wrapper for startListening that clears transcript before starting
    const startListening = () => {
        setTranscript(""); // Clear transcript when starting to listen
        originalStartListening();
    };

    // Create messages array with thinking state if needed
    const displayMessages = [...visibleMessages];

    // If therapist is thinking, add a temporary thinking message
    if (isTherapistThinking) {
        displayMessages.push({
            role: "assistant",
            content: "Therapist thinking...",
            isThinking: true,
        });
    }

    return (
        <div className="container">
            {isLoadingKeys ? (
                <div className="loading-container">
                    <p>Loading API keys...</p>
                </div>
            ) : !keysSubmitted ? (
                <ApiKeyForm
                    deepgramApiKey={deepgramApiKey}
                    claudeApiKey={claudeApiKey}
                    setDeepgramApiKey={setDeepgramApiKey}
                    setClaudeApiKey={setClaudeApiKey}
                    handleSubmitKeys={handleSubmitKeys}
                />
            ) : (
                <>
                    {displayMessages.length === 0 && !transcript && (
                        <div className="welcome-message">
                            How can the therapist help you today?
                        </div>
                    )}

                    <SpeechControls
                        isListening={isListening}
                        isProcessing={isProcessing}
                        isSpeaking={isSpeaking}
                        transcript={transcript}
                        messages={displayMessages}
                        startListening={startListening}
                        stopListening={stopListening}
                        processTranscript={() => processTranscript(transcript)}
                        stopSpeaking={stopSpeaking}
                        clearTranscript={clearTranscript}
                        clearConversation={clearConversation}
                    />

                    <VoiceSelector
                        availableVoices={availableVoices}
                        selectedVoice={selectedVoice}
                        setSelectedVoice={setSelectedVoice}
                        isDisabled={isSpeaking || isProcessing}
                    />

                    {isListening && (
                        <>
                            <VoiceVisualizer
                                isActive={isListening}
                                label="Listening..."
                                className="user-visualizer"
                            />
                            {transcript && (
                                <div className="live-transcript">
                                    {transcript}
                                </div>
                            )}
                        </>
                    )}

                    {displayMessages.length > 0 && (
                        <div className="conversation" ref={conversationRef}>
                            {[...displayMessages]
                                .reverse()
                                .map((message, index) => (
                                    <Message
                                        key={index}
                                        message={message}
                                        index={
                                            displayMessages.length - 1 - index
                                        }
                                        messagesLength={displayMessages.length}
                                        isSpeaking={isSpeaking}
                                        isProcessing={isProcessing}
                                        onTextToSpeech={textToSpeech}
                                        stopSpeaking={stopSpeaking}
                                        activePlayingIndex={activePlayingIndex}
                                    />
                                ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default App;
