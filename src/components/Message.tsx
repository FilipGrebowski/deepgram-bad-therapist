import { VoiceVisualizer } from "./VoiceVisualizer";
import { Message as MessageType } from "../types";

interface MessageProps {
    message: MessageType;
    index: number;
    messagesLength: number;
    currentlyTyping: string;
    isSpeaking: boolean;
    isProcessing: boolean;
    onTextToSpeech: (text: string, messageId: number) => void;
    stopSpeaking: () => void;
    activePlayingIndex: number | null;
}

/**
 * Message component that renders a single message in the conversation
 */
export function Message({
    message,
    index,
    messagesLength,
    currentlyTyping,
    isSpeaking,
    isProcessing,
    onTextToSpeech,
    stopSpeaking,
    activePlayingIndex,
}: MessageProps) {
    const isLastMessage = index === messagesLength - 1;
    const isAssistantMessage = message.role === "assistant";

    // This message is playing if it's the active index and speech is happening
    const isThisMessagePlaying = isSpeaking && activePlayingIndex === index;

    return (
        <div
            className={`message-container ${
                isAssistantMessage ? "ai-message" : "user-message"
            }`}
        >
            <div className="message-header">
                <span className="message-sender">
                    <span
                        className={`participant-indicator ${
                            isAssistantMessage
                                ? "participant-ai"
                                : "participant-user"
                        }`}
                    >
                        {isAssistantMessage ? "Therapist" : "You"}
                    </span>
                </span>
                {isAssistantMessage && message.content && (
                    <button
                        className={`speak-button ${
                            isThisMessagePlaying ? "stop-speech" : ""
                        }`}
                        onClick={() =>
                            isThisMessagePlaying
                                ? stopSpeaking()
                                : onTextToSpeech(message.content, index)
                        }
                        disabled={
                            isProcessing ||
                            (isSpeaking && !isThisMessagePlaying)
                        }
                        title={
                            isThisMessagePlaying
                                ? "Stop speaking"
                                : "Play message"
                        }
                    >
                        {isThisMessagePlaying ? "◼" : "🔊"}
                    </button>
                )}
            </div>
            <div className="message-content">
                {message.content}
                {isAssistantMessage && isThisMessagePlaying && (
                    <div className="message-visualizer">
                        <VoiceVisualizer
                            isActive={true}
                            label=""
                            className="ai-visualizer"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
