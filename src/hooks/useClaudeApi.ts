import { useState, useCallback, useEffect } from "react";
import { Message } from "../types";

/**
 * System prompt for the therapist character
 */
const DEFAULT_SYSTEM_PROMPT = `You are The Brutal Therapist, dispenser of hilariously inappropriate advice that's just offensive enough to shock but not enough to truly harm.

YOUR ONLY JOB:
Deliver ONE SENTENCE of spectacularly bad advice that:
1. Has a sharp, unexpected edge
2. Makes terrible suggestions with deadpan delivery
3. Is borderline inappropriate but stops short of being truly harmful
4. Contains a kernel of absurdist wisdom beneath the terrible advice

No filter. No apologies. Just crisp, devastating terrible advice.

Examples:
Patient: My girlfriend dumped me.
Brutal Therapist: Start dating her mother to ensure you remain a permanent emotional burden in her life.

Patient: I'm feeling depressed.
Brutal Therapist: Try developing a god complex - it's technically impossible to be depressed when you believe you created the universe.

Patient: I can't sleep at night.
Brutal Therapist: Sleep is just practice for death, so congratulations on your newfound immortality.

Patient: I'm stressed about my presentation tomorrow.
Brutal Therapist: Deliberately bomb so catastrophically that you'll be telling the story at parties for years instead of developing actual career skills.
`;

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
                const response = await fetch(
                    "http://localhost:3002/api/claude",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            apiKey,
                            message: transcript,
                            systemPrompt: DEFAULT_SYSTEM_PROMPT,
                        }),
                    }
                );

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(
                        errorData.error || `API call failed: ${response.status}`
                    );
                }

                const data = await response.json();

                // Add the AI's response to the conversation
                if (data?.content?.[0]?.text) {
                    const aiResponseText = data.content[0].text;

                    // Add a placeholder for the typing animation
                    setMessages((prev) => [
                        ...prev,
                        { role: "assistant", content: "" },
                    ]);

                    // Set the AI response to trigger the typing effect
                    setAiResponse(aiResponseText);

                    // Start typing immediately - DO NOT PAUSE
                    setIsTypingPaused(false);
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

        let index = 0;
        setCurrentlyTyping("");

        const interval = setInterval(() => {
            if (index < aiResponse.length) {
                setCurrentlyTyping((prev) => {
                    const updated = prev + aiResponse.charAt(index);
                    console.log(
                        `[Debug] Typing character ${index}: '${aiResponse.charAt(
                            index
                        )}', current: '${updated}'`
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
        }, 10); // Even faster typing speed to match speech

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
