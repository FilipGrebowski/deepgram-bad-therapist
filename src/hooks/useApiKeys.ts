import { useState, useEffect } from "react";

// API URL that works in both development and production
const API_URL =
    window.location.hostname === "localhost" ? "http://localhost:3002" : "";

/**
 * Custom hook for managing API keys
 */
export function useApiKeys() {
    const [deepgramApiKey, setDeepgramApiKey] = useState<string>("");
    const [claudeApiKey, setClaudeApiKey] = useState<string>("");
    const [keysSubmitted, setKeysSubmitted] = useState<boolean>(false);
    const [isLoadingKeys, setIsLoadingKeys] = useState<boolean>(true);

    /**
     * Load API keys from the environment on component mount
     */
    useEffect(() => {
        const loadApiKeys = async () => {
            try {
                setIsLoadingKeys(true);
                const response = await fetch(`${API_URL}/api/keys`);

                if (response.ok) {
                    const data = await response.json();

                    // If the server provides non-empty keys, use them and skip the form
                    if (data.deepgramApiKey && data.claudeApiKey) {
                        setDeepgramApiKey(data.deepgramApiKey);
                        setClaudeApiKey(data.claudeApiKey);
                        setKeysSubmitted(true);
                        console.log("API keys loaded from server environment");
                    } else {
                        console.log(
                            "Server didn't provide API keys, showing input form"
                        );
                    }
                } else {
                    console.error("Failed to load API keys from server");
                }
            } catch (error) {
                console.error("Error loading API keys:", error);
            } finally {
                setIsLoadingKeys(false);
            }
        };

        loadApiKeys();
    }, []);

    /**
     * Handle form submission of API keys
     */
    const handleSubmitKeys = () => {
        if (deepgramApiKey && claudeApiKey) {
            setKeysSubmitted(true);
        } else {
            alert("Please enter both API keys");
        }
    };

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
