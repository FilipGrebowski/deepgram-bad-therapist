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
        messages,
        currentlyTyping,
        processTranscript,
        clearConversation,
        startTypingAnimation,
    } = useClaudeApi(claudeApiKey);

    // Track which message is currently playing
    const [activePlayingIndex, setActivePlayingIndex] = useState<number | null>(
        null
    );

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
        stopSpeaking: originalStopSpeaking,
    } = useTextToSpeech(
        deepgramApiKey,
        selectedVoice,
        startTypingAnimation // Pass the function to start typing when audio starts
    );

    // Wrapper for textToSpeech that tracks which message is playing
    const textToSpeech = (text: string, messageId: number) => {
        setActivePlayingIndex(messageId);
        return originalTextToSpeech(text);
    };

    // Wrapper for stopSpeaking that clears the active message
    const stopSpeaking = () => {
        setActivePlayingIndex(null);
        originalStopSpeaking();
    };

    // Reset active playing index when speech stops
    useEffect(() => {
        if (!isSpeaking) {
            setActivePlayingIndex(null);
        }
    }, [isSpeaking]);

    // Track if we're already processing a TTS request
    const processingTtsRef = useRef(false);

    // Synchronize audio playback with text display
    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        const lastMessageIndex = messages.length - 1;

        // Only process if it's an assistant message with content and we're not already processing a TTS request
        if (
            lastMessage?.role === "assistant" &&
            lastMessage.content &&
            !processingTtsRef.current
        ) {
            processingTtsRef.current = true;

            // First make sure text appears, then process speech
            startTypingAnimation();

            // Slight delay to allow typing to start first
            setTimeout(() => {
                textToSpeech(lastMessage.content, lastMessageIndex).finally(
                    () => {
                        // Reset the processing flag once done
                        processingTtsRef.current = false;
                    }
                );
            }, 50);
        }
    }, [messages, textToSpeech, startTypingAnimation]);

    // Add a ref for the conversation container
    const conversationRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (conversationRef.current) {
            conversationRef.current.scrollTop =
                conversationRef.current.scrollHeight;
        }
    }, [messages, currentlyTyping]);

    // Add back the startListening wrapper that was removed
    // Wrapper for startListening that clears transcript before starting
    const startListening = () => {
        setTranscript(""); // Clear transcript when starting to listen
        originalStartListening();
    };

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
                    {messages.length === 0 && !transcript && (
                        <div className="welcome-message">
                            How can the therapist help you today?
                        </div>
                    )}

                    <SpeechControls
                        isListening={isListening}
                        isProcessing={isProcessing}
                        isSpeaking={isSpeaking}
                        transcript={transcript}
                        messages={messages}
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

                    {messages.length > 0 && (
                        <div className="conversation" ref={conversationRef}>
                            {messages.map((message, index) => (
                                <Message
                                    key={index}
                                    message={message}
                                    index={index}
                                    messagesLength={messages.length}
                                    currentlyTyping={currentlyTyping}
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
