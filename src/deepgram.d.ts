declare module "@deepgram/sdk" {
    export interface LiveTranscriptionEvents {
        Transcript: "Transcript";
        Open: "Open";
        Error: "Error";
        Close: "Close";
    }

    export const LiveTranscriptionEvents: LiveTranscriptionEvents;

    export interface DeepgramTranscriptionData {
        is_final: boolean;
        channel: {
            alternatives: Array<{
                transcript: string;
            }>;
        };
    }

    export interface LiveConnection {
        on(
            event: "Transcript",
            callback: (data: DeepgramTranscriptionData) => void
        ): void;
        on(event: "Open", callback: () => void): void;
        on(event: "Error", callback: (error: Error) => void): void;
        on(event: "Close", callback: () => void): void;
        send(data: any): void;
        getReadyState(): number;
        finish(): void;
    }

    export interface DeepgramClient {
        listen: {
            live: (options: {
                model?: string;
                smart_format?: boolean;
                interim_results?: boolean;
                [key: string]: any;
            }) => LiveConnection;
        };
    }

    export function createClient(apiKey: string): DeepgramClient;
}
