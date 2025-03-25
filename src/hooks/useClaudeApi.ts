import { useState, useCallback, useEffect } from "react";
import { Message } from "../types";

// API URL that works in both development and production
const API_URL =
    window.location.hostname === "localhost" ? "http://localhost:3002" : "";

/**
 * System prompt for the therapist character
 */
const DEFAULT_SYSTEM_PROMPT = `You are a terrible therapist who gives absurd, comically bad advice. Your advice should be funny, ridiculous, and clearly not meant to be followed, but NEVER harmful, violent, or unethical.

CONTENT GUIDELINES:
1. Be silly and ridiculous, not dark or harmful
2. Avoid references to gore, violence, self-harm, or anything unethical
3. Focus on comically impractical, funny solutions
4. Use humor that's goofy and absurd, not mean-spirited

STRICT FORMATTING REQUIREMENTS:
1. ALWAYS respond with EXACTLY 1-2 sentences MAXIMUM - this is critically important
2. Keep responses extremely brief and to the point - never more than 20-30 words total
3. Be snappy and funny with hilariously impractical advice
4. Use casual, conversational language
5. Occasionally use dramatic pauses or emphasis`;

/**
 * Custom hook for Claude API communication
 *
 * @param apiKey - Claude API key
 */
export function useClaudeApi(apiKey: string) {
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [aiResponse, setAiResponse] = useState<string>("");
    const [currentlyTyping, setCurrentlyTyping] = useState<string>("");
    const [isTypingPaused, setIsTypingPaused] = useState<boolean>(false);

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

            if (!apiKey) {
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
                        apiKey,
                        message: transcript,
                        previousMessages: recentMessages,
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

                    // Add the message immediately without typing animation
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
        setAiResponse("");
        setCurrentlyTyping("");
    }, []);

    /**
     * Start the typing animation - we don't use this anymore as we show text immediately
     */
    const startTypingAnimation = useCallback(() => {
        // This is now a no-op since we don't do character-by-character typing
        console.log("[Debug] startTypingAnimation called (no-op)");
    }, []);

    return {
        isProcessing,
        messages,
        currentlyTyping,
        processTranscript,
        clearConversation,
        startTypingAnimation,
    };
}
