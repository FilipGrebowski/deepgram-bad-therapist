import { VoiceModel } from "../types";

interface VoiceSelectorProps {
    availableVoices: VoiceModel[];
    selectedVoice: string;
    setSelectedVoice: (id: string) => void;
    isDisabled: boolean;
}

/**
 * Component for selecting the AI voice
 */
export function VoiceSelector({
    availableVoices,
    selectedVoice,
    setSelectedVoice,
    isDisabled,
}: VoiceSelectorProps) {
    return (
        <div className="voice-selector">
            <label htmlFor="voice-select">AI Voice:</label>
            <select
                id="voice-select"
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                disabled={isDisabled}
            >
                {availableVoices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                        {voice.name}
                    </option>
                ))}
            </select>
        </div>
    );
}
