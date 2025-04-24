import { useState, useEffect, useRef } from "react";

interface VoiceVisualizerProps {
    isActive: boolean;
    label: string;
    className?: string;
}

/**
 * VoiceVisualizer component to visualize voice activity with animated bars
 *
 * @param isActive - Whether the visualizer should be active
 * @param label - Label text to display below the visualizer
 * @param className - Additional CSS class for styling
 */
export function VoiceVisualizer({
    isActive,
    label,
    className,
}: VoiceVisualizerProps) {
    // Use fewer bars for the inline AI visualizer
    const barCount = className === "ai-visualizer" && !label ? 5 : 15;
    const [bars, setBars] = useState<number[]>(Array(barCount).fill(5));
    const analyzing = useRef<boolean>(false);
    const audioContext = useRef<AudioContext | null>(null);
    const analyzer = useRef<AnalyserNode | null>(null);
    const dataArray = useRef<Uint8Array | null>(null);
    const source = useRef<MediaStreamAudioSourceNode | null>(null);
    const animationFrame = useRef<number | null>(null);

    useEffect(() => {
        // Clean up the previous animation frame
        if (animationFrame.current) {
            cancelAnimationFrame(animationFrame.current);
            animationFrame.current = null;
        }

        if (!isActive) {
            setBars(Array(barCount).fill(5));

            // Clean up audio analysis
            if (audioContext.current) {
                audioContext.current.close();
                audioContext.current = null;
                analyzer.current = null;
                dataArray.current = null;
                source.current = null;
                analyzing.current = false;
            }
            return;
        }

        // Set up audio analysis if not already analyzing
        if (!analyzing.current && isActive) {
            analyzing.current = true;

            // Set up audio context and analyzer
            const setupAudioAnalysis = async () => {
                try {
                    audioContext.current = new (window.AudioContext ||
                        (window as any).webkitAudioContext)();
                    analyzer.current = audioContext.current.createAnalyser();
                    analyzer.current.fftSize = 128; // Increased FFT size for better resolution
                    const bufferLength = analyzer.current.frequencyBinCount;
                    dataArray.current = new Uint8Array(bufferLength);

                    // If we're actively listening, use the microphone stream
                    if (label === "Listening...") {
                        const stream =
                            await navigator.mediaDevices.getUserMedia({
                                audio: true,
                            });
                        source.current =
                            audioContext.current.createMediaStreamSource(
                                stream
                            );
                        source.current.connect(analyzer.current);
                    }

                    // Start analysis loop
                    analyzeAudio();
                } catch (error) {
                    console.error("Error setting up audio analysis:", error);
                    analyzing.current = false;
                }
            };

            setupAudioAnalysis();
        }

        // For AI speaking, create more expressive visualization
        if (label === "" && isActive) {
            const interval = setInterval(() => {
                const intensity = Math.random(); // 0-1 intensity factor

                setBars((prev) =>
                    prev.map((_, index) => {
                        // Calculate the center position based on the array length
                        const center = (prev.length - 1) / 2;
                        // Create a more dynamic pattern with varying heights
                        const baseHeight = Math.floor(Math.random() * 25) + 5;
                        const position = Math.abs(
                            (index - center) / prev.length
                        ); // 0-1 based on distance from center
                        const waveEffect =
                            Math.sin(Date.now() / 200 + index) * 10;

                        // Combine effects for more natural looking movement
                        return Math.max(
                            5,
                            baseHeight * (1 - position * 0.5) +
                                waveEffect * intensity
                        );
                    })
                );
            }, 80);

            return () => clearInterval(interval);
        }
    }, [isActive, label, barCount]);

    /**
     * Analyzes audio data and updates the visualization bars
     */
    const analyzeAudio = () => {
        if (!analyzer.current || !dataArray.current || !analyzing.current)
            return;

        const dataArrayRef = dataArray.current; // Create a local reference to prevent null errors
        analyzer.current.getByteFrequencyData(dataArrayRef);

        // Calculate average volume for more accurate visualization
        let sum = 0;
        const samplesToUse = Math.min(30, dataArrayRef.length);
        for (let i = 0; i < samplesToUse; i++) {
            sum += dataArrayRef[i];
        }
        const averageVolume = sum / samplesToUse;

        // Use frequency data to update bar heights with more expression
        const newBars = Array.from({ length: barCount }, (_, index) => {
            const center = (barCount - 1) / 2;
            // Get the corresponding data point, or use average if not available
            const dataPoint =
                index < dataArrayRef.length
                    ? dataArrayRef[index]
                    : averageVolume;

            // Scale the value (0-255) to a reasonable height (5-50px)
            const scaledHeight = Math.max(5, dataPoint / 5);

            // Add slight wave effect for more natural movement
            const waveEffect = Math.sin(Date.now() / 500 + index) * 3;

            // Add position-based scaling (center bars are taller)
            const positionFactor =
                1 - Math.abs((index - center) / barCount) * 0.5;

            return Math.max(5, scaledHeight * positionFactor + waveEffect);
        });

        setBars(newBars);

        // Continue the loop
        animationFrame.current = requestAnimationFrame(analyzeAudio);
    };

    return (
        <div className="voice-container">
            <div className={`voice-visualizer ${className}`}>
                {bars.map((height, index) => (
                    <div
                        key={index}
                        className="visualizer-bar"
                        style={{ height: `${height}px` }}
                    />
                ))}
            </div>
            {label && <div className="visualizer-label">{label}</div>}
        </div>
    );
}
