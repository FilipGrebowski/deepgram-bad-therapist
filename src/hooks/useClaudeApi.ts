import { useState, useCallback, useEffect } from "react";
import { Message } from "../types";

// API URL that works in both development and production
const API_URL =
    window.location.hostname === "localhost" ? "http://localhost:3002" : "";

/**
 * Custom hook for Claude API communication
 *
 * @param apiKey - Claude API key
 */
export function useClaudeApi(apiKey: string) {
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [messages, setMessages] = useState<Message[]>([]);

    // Add a debug log
    useEffect(() => {
        console.log("[Debug] Messages state:", messages.length, "messages");
    }, [messages]);

    /**
     * Process transcript through Claude API and get a response
     */
    const processTranscript = useCallback(
        async (transcript: string) => {
            if (!transcript.trim()) {
                alert("Please say something first!");
                return;
            }

            // Make sure we have an API key or are using environment-provided key
            if (!apiKey && apiKey !== "ENVIRONMENT_PROVIDED") {
                alert("Please enter your Claude API key");
                return;
            }

            try {
                setIsProcessing(true);

                // Add the user's message to the conversation
                const userMessage: Message = {
                    role: "user",
                    content: transcript,
                };

                // Update local messages state with the new user message
                const updatedMessages = [...messages, userMessage];
                setMessages(updatedMessages);

                // Convert previous messages to Claude's format
                // Only include the last 10 messages to stay within context limits
                const recentMessages = updatedMessages
                    .slice(-10)
                    .map((msg) => ({
                        role: msg.role,
                        content: msg.content,
                    }));

                // Get response from Claude through our proxy server
                const response = await fetch(`${API_URL}/api/chat`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        messages: recentMessages,
                        model: "claude-3-5-haiku-20241022",
                        apiKey: apiKey,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(
                        errorData.error || `API call failed: ${response.status}`
                    );
                }

                const data = await response.json();

                // Add the AI's response to the conversation immediately
                if (data?.reply) {
                    const aiResponseText = data.reply;

                    // Add the message immediately
                    setMessages((prev) => [
                        ...prev,
                        { role: "assistant", content: aiResponseText },
                    ]);
                }
            } catch (error) {
                console.error("Error getting AI response:", error);
                alert(
                    `Failed to get AI response: ${
                        error instanceof Error ? error.message : "Unknown error"
                    }`
                );
            } finally {
                setIsProcessing(false);
            }
        },
        [apiKey, messages]
    );

    /**
     * Clear all messages in the conversation
     */
    const clearConversation = useCallback(() => {
        setMessages([]);
    }, []);

    return {
        isProcessing,
        messages,
        processTranscript,
        clearConversation,
    };
}
