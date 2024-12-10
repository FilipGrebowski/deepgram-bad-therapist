interface SpeechControlsProps {
    isListening: boolean;
    isProcessing: boolean;
    isSpeaking: boolean;
    transcript: string;
    messages: any[];
    startListening: () => void;
    stopListening: () => void;
    processTranscript: () => void;
    stopSpeaking: () => void;
    clearTranscript: () => void;
    clearConversation: () => void;
}

/**
 * Component for speech control buttons
 */
export function SpeechControls({
    isListening,
    isProcessing,
    isSpeaking,
    transcript,
    messages,
    startListening,
    stopListening,
    processTranscript,
    stopSpeaking,
    clearTranscript,
    clearConversation,
}: SpeechControlsProps) {
    const hasTranscript = Boolean(transcript.trim());
    const hasMessages = messages.length > 0;

    return (
        <div className="speech-controls">
            {!isListening ? (
                <button
                    onClick={startListening}
                    className="button"
                    disabled={isProcessing || isSpeaking}
                >
                    Start Listening
                </button>
            ) : (
                <button
                    onClick={stopListening}
                    className="button button-danger"
                    disabled={isProcessing}
                >
                    Stop Listening
                </button>
            )}
            <button
                onClick={processTranscript}
                className="button"
                disabled={
                    isListening || isProcessing || isSpeaking || !hasTranscript
                }
            >
                {isProcessing ? "Getting Advice..." : "Get Bad Advice"}
            </button>
            {isSpeaking && (
                <button onClick={stopSpeaking} className="button button-danger">
                    Stop Speaking
                </button>
            )}
            <button
                onClick={clearTranscript}
                className="button button-secondary"
                disabled={
                    isListening || isProcessing || isSpeaking || !hasTranscript
                }
            >
                Clear Input
            </button>
            <button
                onClick={clearConversation}
                className="button button-secondary"
                disabled={
                    isListening ||
                    isProcessing ||
                    isSpeaking ||
                    (!hasMessages && !hasTranscript)
                }
            >
                Reset All
            </button>
        </div>
    );
}
