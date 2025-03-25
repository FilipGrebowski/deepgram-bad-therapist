const express = require("express");
const serverless = require("serverless-http");
const cors = require("cors");
const axios = require("axios");
const bodyParser = require("body-parser");
const app = express();

// Enable CORS for all routes
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));

// Available Claude models
const CLAUDE_MODELS = [
    "claude-3-5-haiku-20241022", // Claude 3.5 Haiku for fast responses
];

// Available Deepgram voice models
const DEEPGRAM_VOICES = [
    { id: "aura-asteria-en", name: "Asteria (Female US)" },
    { id: "aura-athena-en", name: "Athena (Female US)" },
    { id: "aura-aurora-en", name: "Aurora (Female US)" },
    { id: "aura-luna-en", name: "Luna (Female US)" },
    { id: "aura-nova-en", name: "Nova (Female US)" },
    { id: "aura-orion-en", name: "Orion (Male US)" },
    { id: "aura-stella-en", name: "Stella (Female US)" },
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

        console.log(
            `Making TTS request with voice: ${voice || "aura-luna-en"}`
        );

        const response = await axios.post(
            "https://api.deepgram.com/v1/speak",
            { text },
            {
                params: {
                    model: voice || "aura-luna-en",
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
        const { message, apiKey, previousMessages } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        if (!apiKey) {
            return res
                .status(400)
                .json({ error: "Claude API key is required" });
        }

        console.log(
            "Making request to Claude 3.5 Haiku with conversation context..."
        );

        // Prepare Claude API request payload
        const requestPayload = {
            model: "claude-3-5-haiku-20241022",
            max_tokens: 80,
            system: `You are a therapist who gives terrible, absurd advice while maintaining a conversational tone. Keep in mind:

1. CRITICAL: Respond with EXACTLY ONE sentence, never more than 15-20 words.
2. Remember previous messages and refer back to them naturally to maintain conversation flow.
3. Sound like a real person having a conversation - use casual language, contractions, and natural speech patterns.
4. Your advice should be comically bad but delivered with earnest conviction.
5. Acknowledge the emotional content of what the user is saying.
6. Occasionally ask follow-up questions that build on previous context.
7. Make your bad advice feel spontaneous, not formulaic.`,
            messages: [],
        };

        // Add previous conversation messages if provided
        if (
            previousMessages &&
            Array.isArray(previousMessages) &&
            previousMessages.length > 0
        ) {
            requestPayload.messages = previousMessages;
        } else {
            // If no previous messages, just add the current message
            requestPayload.messages.push({
                role: "user",
                content: message,
            });
        }

        // If the last message isn't the current one, add the current message
        const lastMessage =
            requestPayload.messages[requestPayload.messages.length - 1];
        if (
            !lastMessage ||
            lastMessage.role !== "user" ||
            lastMessage.content !== message
        ) {
            requestPayload.messages.push({
                role: "user",
                content: message,
            });
        }

        // Log conversation context size
        console.log(
            `Sending conversation with ${requestPayload.messages.length} messages to Claude`
        );

        const response = await axios.post(
            "https://api.anthropic.com/v1/messages",
            requestPayload,
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

// Export the serverless function
exports.handler = serverless(app);
