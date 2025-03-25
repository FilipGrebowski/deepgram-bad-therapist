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
        console.log("[Debug] Typing state:", {
            aiResponse,
            isTypingPaused,
            currentlyTyping,
        });
    }, [aiResponse, isTypingPaused, currentlyTyping]);

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

                setMessages((prev) => [...prev, userMessage]);

                // Get response from Claude through our proxy server
                const response = await fetch(`${API_URL}/api/chat`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        apiKey,
                        message: transcript,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(
                        errorData.error || `API call failed: ${response.status}`
                    );
                }

                const data = await response.json();

                // Add the AI's response to the conversation
                if (data?.reply) {
                    const aiResponseText = data.reply;

                    // Add a placeholder for the typing animation
                    setMessages((prev) => [
                        ...prev,
                        { role: "assistant", content: "" },
                    ]);

                    // Reset the current typing text before setting the new response
                    setCurrentlyTyping("");

                    // Small delay to ensure state updates properly
                    setTimeout(() => {
                        // Set the AI response to trigger the typing effect
                        setAiResponse(aiResponseText);
                        // Start typing immediately - DO NOT PAUSE
                        setIsTypingPaused(false);
                    }, 10);
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
        [apiKey]
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
     * Start the typing animation - but we now display immediately
     */
    const startTypingAnimation = useCallback(() => {
        setIsTypingPaused(false);
    }, []);

    // Handle typing effect for AI responses
    useEffect(() => {
        if (!aiResponse) {
            console.log("[Debug] No AI response to type");
            return;
        }

        if (isTypingPaused) {
            console.log("[Debug] Typing is paused");
            return;
        }

        console.log("[Debug] Starting typing animation with:", aiResponse);

        // Make sure current typing is reset before starting
        setCurrentlyTyping("");

        let index = 0;
        const responseLength = aiResponse.length;

        const interval = setInterval(() => {
            if (index < responseLength) {
                setCurrentlyTyping((prev) => {
                    const nextChar = aiResponse.charAt(index);
                    const updated = prev + nextChar;
                    console.log(
                        `[Debug] Typing character ${index}: '${nextChar}', current: '${updated}'`
                    );
                    return updated;
                });
                index++;
            } else {
                console.log("[Debug] Typing complete, updating messages");
                clearInterval(interval);

                // Add the complete message to conversation
                setMessages((prev) => [
                    ...prev.slice(0, prev.length - 1),
                    { role: "assistant", content: aiResponse },
                ]);

                setAiResponse("");
                setCurrentlyTyping("");
            }
        }, 25); // Slightly slower typing for better visibility

        return () => clearInterval(interval);
    }, [aiResponse, isTypingPaused]);

    return {
        isProcessing,
        messages,
        currentlyTyping,
        processTranscript,
        clearConversation,
        startTypingAnimation,
    };
}
