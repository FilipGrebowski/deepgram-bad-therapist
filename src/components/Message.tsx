import { VoiceVisualizer } from "./VoiceVisualizer";
import { Message as MessageType } from "../types";

interface MessageProps {
    message: MessageType;
    index: number;
    messagesLength: number;
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
    isSpeaking,
    isProcessing,
    onTextToSpeech,
    stopSpeaking,
    activePlayingIndex,
}: MessageProps) {
    const isLastMessage = index === messagesLength - 1;
    const isAssistantMessage = message.role === "assistant";
    const isThinking = message.isThinking === true;

    // This message is playing if it's the active index and speech is happening
    const isThisMessagePlaying = isSpeaking && activePlayingIndex === index;

    // Function to download the message audio
    const downloadAudio = async () => {
        try {
            // API URL that works in both development and production
            const API_URL =
                window.location.hostname === "localhost"
                    ? "http://localhost:3002"
                    : "";
            const endpoint =
                window.location.hostname === "localhost"
                    ? "/api/download-audio"
                    : "/.netlify/functions/api/download-audio";

            const response = await fetch(`${API_URL}${endpoint}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    text: message.content,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to download audio");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `therapist-response-${index + 1}.mp3`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error downloading audio:", error);
            alert("Failed to download audio. Please try again.");
        }
    };

    return (
        <div
            className={`message-container ${
                isAssistantMessage ? "ai-message" : "user-message"
            } ${isThinking ? "thinking-message" : ""}`}
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
                {isAssistantMessage && message.content && !isThinking && (
                    <div className="message-actions">
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
                        <button
                            className="download-button"
                            onClick={downloadAudio}
                            disabled={isProcessing || isThinking}
                            title="Download audio"
                        >
                            ⬇️
                        </button>
                    </div>
                )}
            </div>
            <div
                className={`message-content ${
                    isThinking ? "thinking-content" : ""
                }`}
            >
                {isAssistantMessage && isThisMessagePlaying && (
                    <div className="message-visualizer-inline">
                        <VoiceVisualizer
                            isActive={true}
                            label=""
                            className="ai-visualizer"
                        />
                    </div>
                )}
                {isThinking && (
                    <div className="message-visualizer-inline">
                        <div className="thinking-dots">
                            <span className="thinking-dot"></span>
                            <span className="thinking-dot"></span>
                            <span className="thinking-dot"></span>
                        </div>
                    </div>
                )}
                <div className="message-text">{message.content}</div>
            </div>
        </div>
    );
}
