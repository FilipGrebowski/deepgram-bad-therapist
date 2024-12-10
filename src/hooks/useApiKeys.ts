import { useState, useEffect, useCallback } from "react";
import { ApiKeys } from "../types";

/**
 * Custom hook for managing API keys
 */
export function useApiKeys() {
    const [deepgramApiKey, setDeepgramApiKey] = useState<string>("");
    const [claudeApiKey, setClaudeApiKey] = useState<string>("");
    const [keysSubmitted, setKeysSubmitted] = useState<boolean>(false);
    const [isLoadingKeys, setIsLoadingKeys] = useState<boolean>(true);

    /**
     * Load API keys from server on mount
     */
    useEffect(() => {
        const loadApiKeys = async () => {
            try {
                const response = await fetch("http://localhost:3002/api/keys");
                if (response.ok) {
                    const data: ApiKeys = await response.json();
                    if (data.deepgramApiKey)
                        setDeepgramApiKey(data.deepgramApiKey);
                    if (data.claudeApiKey) setClaudeApiKey(data.claudeApiKey);

                    // Auto-submit if both keys are available
                    if (data.deepgramApiKey && data.claudeApiKey) {
                        setKeysSubmitted(true);
                    }
                }
            } catch (error) {
                console.error("Failed to load API keys:", error);
            } finally {
                setIsLoadingKeys(false);
            }
        };

        loadApiKeys();
    }, []);

    /**
     * Handle submission of API keys
     */
    const handleSubmitKeys = useCallback(() => {
        if (deepgramApiKey.trim() && claudeApiKey.trim()) {
            setKeysSubmitted(true);
        } else {
            alert("Please enter valid API keys for both services");
        }
    }, [deepgramApiKey, claudeApiKey]);

    return {
        deepgramApiKey,
        claudeApiKey,
        setDeepgramApiKey,
        setClaudeApiKey,
        keysSubmitted,
        isLoadingKeys,
        handleSubmitKeys,
    };
}
