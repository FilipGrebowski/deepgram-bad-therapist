import { useState, useEffect } from "react";
import { VoiceModel } from "../types";

// API URL that works in both development and production
const API_URL =
    window.location.hostname === "localhost" ? "http://localhost:3002" : "";

// Default Deepgram voices
const DEFAULT_VOICES: VoiceModel[] = [
    { id: "aura-2-thalia-en", name: "Thalia (Female US)", language: "en" },
    {
        id: "aura-2-andromeda-en",
        name: "Andromeda (Female US)",
        language: "en",
    },
    { id: "aura-2-helena-en", name: "Helena (Female US)", language: "en" },
    { id: "aura-2-apollo-en", name: "Apollo (Male US)", language: "en" },
    { id: "aura-2-arcas-en", name: "Arcas (Male US)", language: "en" },
    { id: "aura-2-aries-en", name: "Aries (Male US)", language: "en" },
];

/**
 * Custom hook for managing voice models
 */
export function useVoiceModels() {
    const [availableVoices, setAvailableVoices] =
        useState<VoiceModel[]>(DEFAULT_VOICES);
    const [selectedVoice, setSelectedVoice] = useState<string>(
        "aura-2-andromeda-en"
    );

    /**
     * Load available voices from server (if available)
     */
    useEffect(() => {
        const loadVoices = async () => {
            try {
                const response = await fetch(`${API_URL}/api/voices`);
                if (response.ok) {
                    const data = await response.json();
                    if (
                        data.voices &&
                        Array.isArray(data.voices) &&
                        data.voices.length > 0
                    ) {
                        setAvailableVoices(data.voices);
                    }
                }
            } catch (error) {
                console.error("Failed to load voices:", error);
                // Keep using default voices if server request fails
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
