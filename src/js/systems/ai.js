import { CONFIG } from '../config.js';

export class AIClient {
    constructor() {
        this.apiKey = localStorage.getItem('deepseek_api_key') || '';
        this.enabled = !!this.apiKey;
        this.cache = new Map();
        this.queue = [];
        this.processing = false;

        console.log('AI Client initialized. Enabled:', this.enabled);
    }

    setApiKey(key) {
        this.apiKey = key.trim();
        localStorage.setItem('deepseek_api_key', this.apiKey);
        this.enabled = !!this.apiKey;
    }

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
