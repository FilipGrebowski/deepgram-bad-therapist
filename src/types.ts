export interface Message {
    role: "user" | "assistant";
    content: string;
    isThinking?: boolean;
}

export interface VoiceModel {
    id: string;
    name: string;
    language: string;
    model?: string;
}
