import { CONFIG } from '../config.js';

/**
 * AI System Module
 *
 * This module manages interactions with the DeepSeek API (or other LLMs) to generate
 * dynamic game content. It includes caching, error handling, and prompt engineering
 * templates for various RPG elements.
 *
 * Architecture Notes:
 * - Content Generation: Uses specific methods (generateNPC, generateQuest, etc.) to
 *   construct structured prompts.
 * - JSON Parsing: All prompts request JSON output. The system attempts to parse
 *   responses, handling markdown code blocks if present.
 * - Caching: Responses are cached by prompt hash to reduce API calls and latency.
 * - Error Handling: Graceful fallbacks (returning null or notifying UI) on API failures.
 *
 * Future Enhancements:
 * - Implement streaming responses for dialogue to reduce perceived latency.
 * - Add 'context' management to maintain world state across multiple generations
 *   (e.g., remembering previous NPC interactions or world events).
 * - Create a 'Director' AI that monitors player actions and dynamically adjusts
 *   difficulty or narrative pacing.
 */
export class AIClient {
    constructor() {
        this.apiKey = localStorage.getItem('deepseek_api_key') || '';
        this.enabled = !!this.apiKey;
        this.cache = new Map();
        this.queue = [];
        this.processing = false;

        console.log('AI Client initialized. Enabled:', this.enabled);
    }

    /**
     * Set the API key and persist it to localStorage.
     * @param {string} key - The API key.
     */
    setApiKey(key) {
        this.apiKey = key.trim();
        localStorage.setItem('deepseek_api_key', this.apiKey);
        this.enabled = !!this.apiKey;
    }

    /**
     * Generic generation method.
     * @param {string} prompt - The prompt to send to the AI.
     * @param {string} type - The type of content (for logging).
     * @param {number} maxTokens - Token limit for response.
     * @returns {Promise<object|null>} Parsed JSON result or null on failure.
     */
    async generate(prompt, type = 'generic', maxTokens = 500) {
        if (!this.enabled) {
            console.warn('AI generation skipped: No API Key');
            return null;
        }

        const cacheKey = this.hashCode(prompt);
        if (this.cache.has(cacheKey)) {
            console.log(`[AI] Cache hit for ${type}`);
            return this.cache.get(cacheKey);
        }

        try {
            console.log(`[AI] Generating ${type}...`);

            const requestBody = {
                model: CONFIG.AI_MODEL,
                messages: [
                    { role: 'system', content: 'You are a creative RPG content generator. Always respond with valid JSON only, no markdown formatting.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: maxTokens,
                temperature: 0.8
            };

            const response = await fetch(CONFIG.DEEPSEEK_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            const data = await response.json();

            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid API response structure');
            }

            const content = data.choices[0].message.content;
            let result;
            try {
                // Handle potential markdown code blocks
                const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
                const jsonStr = jsonMatch ? jsonMatch[1] : content;
                result = JSON.parse(jsonStr);
            } catch (e) {
                console.warn('[AI] Failed to parse JSON, returning raw text', e);
                result = { text: content };
            }

            this.cache.set(cacheKey, result);
            return result;

        } catch (error) {
            console.error('[AI] Generation error:', error);
            // TODO: Notify user via UI
            return null;
        }
    }

    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    // Specialized generation methods

    /**
     * Generate lore for a new world.
     * @param {string} seed - Seed or theme string.
     */
    async generateWorldLore(seed) {
        const prompt = `Generate a fantasy world for an RPG game. Theme: "${seed || 'mystical medieval'}".
        Create: world name, description, 5 region names with descriptions, history, and current conflicts.
        Respond with JSON:
        {
            "worldName": "string",
            "description": "string",
            "theme": "string",
            "regions": [{"name": "string", "description": "string", "biome": "string"}],
            "history": "string",
            "conflicts": ["string"],
            "factions": [{"name": "string", "description": "string"}]
        }`;
        return await this.generate(prompt, 'World Lore', 800);
    }

    /**
     * Generate a unique NPC.
     * @param {string} worldContext - Description of the world.
     * @param {string} location - Current location name.
     */
    async generateNPC(worldContext, location) {
        const prompt = `Create a unique NPC for a fantasy RPG. World: ${worldContext}
        Location: ${location}. Include: name, race, occupation, personality traits, backstory, dialogue style, and a quest they might offer.
        Respond with JSON:
        {
            "name": "string",
            "race": "string",
            "occupation": "string",
            "personality": "string",
            "backstory": "string",
            "dialogueStyle": "string",
            "greeting": "string",
            "quest": {
                "title": "string",
                "description": "string",
                "objective": "string",
                "reward": "string"
            }
        }`;
        return await this.generate(prompt, 'NPC', 700);
    }

    /**
     * Generate dynamic dialogue response.
     * @param {string} npcContext - Description of the NPC.
     * @param {string} playerMessage - What the player said.
     * @param {Array} conversationHistory - Previous exchanges.
     */
    async generateDialogue(npcContext, playerMessage, conversationHistory) {
        const history = conversationHistory.map(h => `${h.speaker}: ${h.text}`).join('\n');
        const prompt = `NPC: ${npcContext}
        Conversation history:
        ${history}

        Player says: "${playerMessage}"

        Respond as the NPC. Stay in character. Keep response to 1-2 sentences.
        Also provide 3-4 dialogue options for the player to respond with.

        Respond with JSON:
        {
            "response": "string",
            "playerOptions": ["string", "string", "string", "string"],
            "mood": "friendly|neutral|hostile|curious"
        }`;
        return await this.generate(prompt, 'Dialogue', 400);
    }
}
