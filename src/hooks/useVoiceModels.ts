import { useState, useEffect } from "react";
import { VoiceModel } from "../types";

/**
 * Custom hook for managing voice models
 */
export function useVoiceModels() {
    const [availableVoices, setAvailableVoices] = useState<VoiceModel[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<string>("luna");

    /**
     * Load available voices from server
     */
    useEffect(() => {
        const loadVoices = async () => {
            try {
                const response = await fetch(
                    "http://localhost:3002/api/voices"
                );
                if (response.ok) {
                    const data = await response.json();
                    if (data.voices && Array.isArray(data.voices)) {
                        setAvailableVoices(data.voices);
                    }
                }
            } catch (error) {
                console.error("Failed to load voices:", error);
            }
        };

        loadVoices();
    }, []);

    return {
        availableVoices,
        selectedVoice,
        setSelectedVoice,
    };
}
