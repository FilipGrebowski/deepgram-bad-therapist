import { useState, useEffect } from "react";
import { VoiceModel } from "../types";

// API URL that works in both development and production
const API_URL =
    window.location.hostname === "localhost" ? "http://localhost:3002" : "";

// Default Deepgram voices
const DEFAULT_VOICES: VoiceModel[] = [
    { id: "aura-asteria-en", name: "Asteria (Female US)", language: "en" },
    { id: "aura-athena-en", name: "Athena (Female US)", language: "en" },
    { id: "aura-aurora-en", name: "Aurora (Female US)", language: "en" },
    { id: "aura-luna-en", name: "Luna (Female US)", language: "en" },
    { id: "aura-nova-en", name: "Nova (Female US)", language: "en" },
    { id: "aura-orion-en", name: "Orion (Male US)", language: "en" },
    { id: "aura-stella-en", name: "Stella (Female US)", language: "en" },
];

/**
 * Custom hook for managing voice models
 */
export function useVoiceModels() {
    const [availableVoices, setAvailableVoices] =
        useState<VoiceModel[]>(DEFAULT_VOICES);
    const [selectedVoice, setSelectedVoice] = useState<string>("aura-luna-en");

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
