/**
 * Message interface for user-assistant interactions
 */
export interface Message {
    role: "user" | "assistant";
    content: string;
}

/**
 * Message format for Anthropic API
 */
export interface AnthropicMessage {
    role: "user" | "assistant";
    content: string;
}

/**
 * Data structure for Deepgram transcription results
 */
export interface DeepgramTranscriptionData {
    is_final: boolean;
    channel: {
        alternatives: Array<{
            transcript: string;
        }>;
    };
}

/**
 * API Keys interface
 */
export interface ApiKeys {
    deepgramApiKey: string;
    claudeApiKey: string;
}

/**
 * Voice model interface for TTS
 */
export interface VoiceModel {
    id: string;
    name: string;
    language?: string;
}
