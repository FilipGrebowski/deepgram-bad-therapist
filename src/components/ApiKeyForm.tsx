interface ApiKeyFormProps {
    deepgramApiKey: string;
    claudeApiKey: string;
    setDeepgramApiKey: (key: string) => void;
    setClaudeApiKey: (key: string) => void;
    handleSubmitKeys: () => void;
}

/**
 * Form component for entering API keys
 */
export function ApiKeyForm({
    deepgramApiKey,
    claudeApiKey,
    setDeepgramApiKey,
    setClaudeApiKey,
    handleSubmitKeys,
}: ApiKeyFormProps) {
    return (
        <div className="api-keys">
            <h2>Enter Your API Keys</h2>
            <div className="api-key-form">
                <div className="input-group">
                    <label htmlFor="deepgram-key">Deepgram API Key</label>
                    <input
                        id="deepgram-key"
                        type="password"
                        value={deepgramApiKey}
                        onChange={(e) => setDeepgramApiKey(e.target.value)}
                        placeholder="Your Deepgram API Key"
                    />
                </div>
                <div className="input-group">
                    <label htmlFor="claude-key">Claude API Key</label>
                    <input
                        id="claude-key"
                        type="password"
                        value={claudeApiKey}
                        onChange={(e) => setClaudeApiKey(e.target.value)}
                        placeholder="Your Claude API Key"
                    />
                </div>
                <button onClick={handleSubmitKeys} className="button">
                    Submit
                </button>
            </div>
        </div>
    );
}
