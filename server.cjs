require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const app = express();
const PORT = process.env.PORT || 3002;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Available Claude models to try in order of preference
const CLAUDE_MODELS = [
    "claude-3-5-sonnet-20241022", // Latest Claude 3.5 Sonnet model
];

// Available Deepgram voice models
const DEEPGRAM_VOICES = [
    { id: "luna", name: "Luna (Female US)", model: "aura-luna-en" },
    { id: "stella", name: "Stella (Female US)", model: "aura-stella-en" },
    { id: "asteria", name: "Asteria (Female US)", model: "aura-asteria-en" },
    { id: "athena", name: "Athena (Female UK)", model: "aura-athena-en" },
    { id: "hera", name: "Hera (Female US)", model: "aura-hera-en" },
    { id: "zeus", name: "Zeus (Male US)", model: "aura-zeus-en" },
    { id: "arcas", name: "Arcas (Male US)", model: "aura-arcas-en" },
    { id: "orion", name: "Orion (Male US)", model: "aura-orion-en" },
    { id: "perseus", name: "Perseus (Male US)", model: "aura-perseus-en" },
    { id: "helios", name: "Helios (Male UK)", model: "aura-helios-en" },
];

// Proxy endpoint for Claude API
app.post("/api/claude", async (req, res) => {
    try {
        const { apiKey, message, systemPrompt } = req.body;
        const claudeApiKey = apiKey || process.env.CLAUDE_API_KEY;

        if (!claudeApiKey || !message) {
            return res
                .status(400)
                .json({ error: "API key and message are required" });
        }

        console.log("Making request to Claude 3.5 Sonnet...");

        try {
            const response = await axios.post(
                "https://api.anthropic.com/v1/messages",
                {
                    model: "claude-3-5-sonnet-20241022", // Latest Claude 3.5 Sonnet model
                    max_tokens: 1000,
                    system:
                        systemPrompt ||
                        `You are a terrible therapist who gives absurd, comically bad advice. Your advice should be funny, ridiculous, and clearly not meant to be followed, but NEVER harmful, violent, or unethical.

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
5. Occasionally use dramatic pauses or emphasis`,
                    messages: [
                        {
                            role: "user",
                            content: message,
                        },
                    ],
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": claudeApiKey,
                        "anthropic-version": "2023-06-01",
                    },
                }
            );

            console.log("Success with Claude 3.5 Sonnet!");
            return res.json(response.data);
        } catch (error) {
            console.error("Error with Claude 3.5 Sonnet:", error.message);

            if (error.response?.data) {
                console.error(
                    "Error details:",
                    JSON.stringify(error.response.data, null, 2)
                );
            }

            res.status(error.response?.status || 500).json({
                error:
                    error.response?.data?.error?.message ||
                    "Failed to get response from Claude 3.5 Sonnet. Please check your API key and try again.",
            });
        }
    } catch (error) {
        console.error(
            "Error calling Claude API:",
            error.response?.data || error.message
        );

        // Better error logging
        if (error.response?.data) {
            console.error(
                "Error details:",
                JSON.stringify(error.response.data, null, 2)
            );
        }

        res.status(error.response?.status || 500).json({
            error:
                error.response?.data?.error?.message ||
                "Failed to get response from Claude",
        });
    }
});

// Text-to-Speech endpoint using Deepgram API
app.post("/api/tts", async (req, res) => {
    try {
        const { text, apiKey, voice } = req.body;
        const deepgramApiKey = apiKey || process.env.DEEPGRAM_API_KEY;

        if (!deepgramApiKey || !text) {
            return res
                .status(400)
                .json({ error: "API key and text are required" });
        }

        // Find the selected voice or default to Luna
        let selectedVoice =
            DEEPGRAM_VOICES.find((v) => v.id === voice) || DEEPGRAM_VOICES[0];
        console.log(
            `Making request to Deepgram TTS API using voice: ${selectedVoice.name}`
        );

        // Create a clean request payload with only the text parameter
        const requestPayload = { text };

        const response = await axios({
            method: "post",
            url: `https://api.deepgram.com/v1/speak?model=${selectedVoice.model}`,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Token ${deepgramApiKey}`,
            },
            data: requestPayload,
            responseType: "arraybuffer",
            validateStatus: function (status) {
                return status < 500;
            },
        });

        // Check if the response is an error (not binary audio data)
        if (response.status !== 200) {
            // Convert buffer to string and parse as JSON if it's an error
            const errorText = Buffer.from(response.data).toString("utf8");
            try {
                const errorJson = JSON.parse(errorText);
                console.error("Deepgram TTS API error:", errorJson);
                return res.status(response.status).json({
                    error: errorJson.err_msg || "Failed to generate speech",
                });
            } catch (e) {
                console.error("Could not parse error response:", errorText);
                return res.status(response.status).json({
                    error: "Failed to generate speech",
                });
            }
        }

        console.log("Received audio response from Deepgram TTS API");

        // Send back audio as base64 for the browser to play
        const base64Audio = Buffer.from(response.data).toString("base64");

        res.json({
            audio: base64Audio,
            format: "audio/mpeg",
        });
    } catch (error) {
        console.error("Error calling Deepgram TTS API:", error.message);

        res.status(500).json({
            error: "Failed to generate speech: " + error.message,
        });
    }
});

// Endpoint to fetch API keys from .env
app.get("/api/keys", (req, res) => {
    res.json({
        deepgramApiKey: process.env.DEEPGRAM_API_KEY || "",
        claudeApiKey: process.env.CLAUDE_API_KEY || "",
    });
});

// Endpoint to get available voice models
app.get("/api/voices", (req, res) => {
    res.json({
        voices: DEEPGRAM_VOICES,
    });
});

// Simple health check endpoint
app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
});

app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
});
