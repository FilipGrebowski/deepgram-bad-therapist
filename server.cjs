require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3002;

// Enable CORS for all routes
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "dist")));

// Available Claude models to try in order of preference
const CLAUDE_MODELS = [
    "claude-3-5-haiku-20241022", // Claude 3.5 Haiku for fast responses
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

// Routes
app.get("/api/models", (req, res) => {
    res.json({
        claude: CLAUDE_MODELS,
    });
});

app.get("/api/keys", (req, res) => {
    res.json({
        deepgramApiKey: process.env.DEEPGRAM_API_KEY || "",
        claudeApiKey: process.env.CLAUDE_API_KEY || "",
    });
});

app.post("/api/tts", async (req, res) => {
    try {
        const { text, apiKey, voice } = req.body;

        if (!text) {
            return res.status(400).json({ error: "Text is required" });
        }

        if (!apiKey) {
            return res
                .status(400)
                .json({ error: "Deepgram API key is required" });
        }

        console.log(`Making TTS request with voice: ${voice || "luna"}`);

        const response = await axios.post(
            "https://api.deepgram.com/v1/speak",
            { text },
            {
                params: {
                    model: voice || "aura-asteria-en",
                },
                headers: {
                    Authorization: `Token ${apiKey}`,
                    "Content-Type": "application/json",
                },
                responseType: "arraybuffer",
            }
        );

        const base64Audio = Buffer.from(response.data).toString("base64");
        res.json({
            audio: base64Audio,
            format: "audio/mp3",
        });
    } catch (error) {
        // For error buffers, convert to string
        if (error.response?.data instanceof Buffer) {
            try {
                const errorText = error.response.data.toString("utf8");
                const errorJson = JSON.parse(errorText);
                console.error("TTS error:", errorJson);
                return res.status(error.response.status || 500).json({
                    error: `Failed to convert text to speech: ${
                        errorJson.err_msg || "Unknown error"
                    }`,
                });
            } catch (e) {
                console.error(
                    "TTS error (raw):",
                    error.response.data.toString("utf8")
                );
            }
        } else {
            console.error("TTS error:", error.response?.data || error.message);
        }

        res.status(500).json({ error: "Failed to convert text to speech" });
    }
});

app.post("/api/chat", async (req, res) => {
    try {
        const { message, apiKey } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        if (!apiKey) {
            return res
                .status(400)
                .json({ error: "Claude API key is required" });
        }

        console.log("Making request to Claude 3.5 Haiku...");

        const response = await axios.post(
            "https://api.anthropic.com/v1/messages",
            {
                model: "claude-3-5-haiku-20241022",
                max_tokens: 4000,
                messages: [
                    {
                        role: "system",
                        content: `You are a therapist with poor advice. When anyone asks you a question, you should respond with spectacularly bad advice that no real therapist would ever give. Make sure your advice is funny but also genuinely terrible. Be specific. Don't be helpful, but make it sound like you're trying to be. Keep responses under 100 words.`,
                    },
                    {
                        role: "user",
                        content: message,
                    },
                ],
            },
            {
                headers: {
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
            }
        );

        console.log("Claude 3.5 Haiku responded successfully");
        res.json({
            reply: response.data.content[0].text,
        });
    } catch (error) {
        console.error(
            "Claude 3.5 Haiku API error:",
            error.response?.data || error.message
        );
        res.status(500).json({ error: "Failed to get response from Claude" });
    }
});

// Catch-all handler for SPA
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
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
    console.log(`Server running on port ${PORT}`);
});
