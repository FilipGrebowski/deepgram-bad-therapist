import { VoiceVisualizer } from "./VoiceVisualizer";
import { Message as MessageType } from "../types";
import { TypingAnimation } from "./TypingAnimation";

interface MessageProps {
    message: MessageType;
    index: number;
    messagesLength: number;
    currentlyTyping: string;
    isSpeaking: boolean;
    isProcessing: boolean;
    onTextToSpeech: (text: string) => void;
    stopSpeaking: () => void;
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
}: MessageProps) {
    const isLastMessage = index === messagesLength - 1;
    const isAssistantMessage = message.role === "assistant";
    const isEmpty = !message.content;

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
                            isSpeaking ? "stop-speech" : ""
                        }`}
                        onClick={() =>
                            isSpeaking
                                ? stopSpeaking()
                                : onTextToSpeech(message.content)
                        }
                        disabled={isProcessing}
                    >
                        {isSpeaking ? "◼" : "🔊"}
                    </button>
                )}
            </div>
            <div className="message-content">
                {isLastMessage && isAssistantMessage && isEmpty ? (
                    <>{currentlyTyping || <TypingAnimation />}</>
                ) : (
                    message.content
                )}
                {isAssistantMessage && isSpeaking && isLastMessage && (
                    <div className="message-visualizer">
                        <VoiceVisualizer
                            isActive={isSpeaking}
                            label=""
                            className="ai-visualizer"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
