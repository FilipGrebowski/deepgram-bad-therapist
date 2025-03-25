# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

-   [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
-   [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
    extends: [
        // Remove ...tseslint.configs.recommended and replace with this
        ...tseslint.configs.recommendedTypeChecked,
        // Alternatively, use this for stricter rules
        ...tseslint.configs.strictTypeChecked,
        // Optionally, add this for stylistic rules
        ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
        // other options...
        parserOptions: {
            project: ["./tsconfig.node.json", "./tsconfig.app.json"],
            tsconfigRootDir: import.meta.dirname,
        },
    },
});
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default tseslint.config({
    plugins: {
        // Add the react-x and react-dom plugins
        "react-x": reactX,
        "react-dom": reactDom,
    },
    rules: {
        // other rules...
        // Enable its recommended typescript rules
        ...reactX.configs["recommended-typescript"].rules,
        ...reactDom.configs.recommended.rules,
    },
});
```

# Deepgram Bad Therapist

A comedic web application that combines real-time speech recognition, text-to-speech, and AI to create an intentionally terrible therapist experience.

## Live Demo

Visit the live application: [https://deepgram-therapist.netlify.app](https://deepgram-therapist.netlify.app)

## Features

-   **Speech Recognition** - Speak directly to the therapist using Deepgram's real-time speech-to-text API
-   **Text-to-Speech** - Listen to the therapist's responses with high-quality voices from Deepgram
-   **Conversational AI** - Powered by Claude 3.5 Haiku, providing comedic and intentionally terrible advice
-   **Conversation Context** - The therapist remembers previous exchanges for a more natural conversation
-   **Voice Selection** - Choose from multiple voice options for the therapist

## Technology Stack

-   **Frontend**: React + TypeScript + Vite
-   **Backend**: Node.js + Express (via Netlify Functions)
-   **APIs**:
    -   [Deepgram](https://deepgram.com/) for speech recognition and text-to-speech
    -   [Anthropic Claude](https://www.anthropic.com/claude) for AI conversation

## Local Development

### Prerequisites

-   Node.js (v18 or higher)
-   npm or yarn
-   Deepgram API key
-   Claude API key

### Setup

1. Clone the repository:

    ```bash
    git clone https://github.com/FilipGrebowski/deepgram-bad-therapist.git
    cd deepgram-bad-therapist
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Create a `.env` file in the root directory with your API keys:

    ```
    DEEPGRAM_API_KEY=your_deepgram_api_key_here
    CLAUDE_API_KEY=your_claude_api_key_here
    ```

4. Start the development server:

    ```bash
    npm run dev
    ```

5. Open your browser to http://localhost:5173

## Deployment

The application is deployed on Netlify with serverless functions handling the backend API. To deploy your own instance:

1. Fork or clone this repository
2. Sign up for a Netlify account
3. Connect your GitHub repository to Netlify
4. Set the following environment variables in Netlify:
    - `DEEPGRAM_API_KEY`
    - `CLAUDE_API_KEY`
5. Deploy!

## How It Works

1. **Speech Recognition**: When you speak into your microphone, Deepgram's speech-to-text API transcribes your speech in real-time.
2. **AI Processing**: Your message is sent to Claude 3.5 Haiku, which responds with intentionally terrible therapeutic advice.
3. **Text-to-Speech**: The AI's response is converted to speech using Deepgram's text-to-speech API and played back.
4. **Context Maintenance**: The app maintains conversation history so the therapist can reference previous exchanges.

## Project Structure

-   `src/` - Frontend React application
    -   `components/` - UI components
    -   `hooks/` - Custom React hooks for API communication
    -   `types/` - TypeScript type definitions
-   `netlify/functions/` - Serverless backend functions
-   `server.cjs` - Local development server
-   `public/` - Static assets

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

-   [Deepgram](https://deepgram.com/) for their excellent speech APIs
-   [Anthropic](https://www.anthropic.com/) for Claude's conversational capabilities
-   [Netlify](https://www.netlify.com/) for hosting and serverless functions
