import { CONFIG } from '../config.js';

/**
 * AI Client - Manages DeepSeek API interactions for dynamic content generation.
 * Includes caching, error handling, and structured prompts for RPG elements.
 */
export class AIClient {
    constructor() {
        this.apiKey = localStorage.getItem('deepseek_api_key') || '';
        this.enabled = !!this.apiKey;
        this.cache = new Map();
        this.queue = [];
        this.processing = false;
        this.maxTokens = CONFIG.AI_RESPONSE_LENGTH?.medium || 500;

        console.log('AI Client initialized. Enabled:', this.enabled);
    }

    setApiKey(key) {
        this.apiKey = key.trim();
        localStorage.setItem('deepseek_api_key', this.apiKey);
        this.enabled = !!this.apiKey;
    }

    /**
     * Test the API connection.
     */
    async testConnection() {
        if (!this.apiKey) return false;
        try {
            const response = await fetch(CONFIG.DEEPSEEK_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: CONFIG.AI_MODEL,
                    messages: [{ role: 'user', content: 'Say "connected" in one word.' }],
                    max_tokens: 10
                })
            });
            return response.ok;
        } catch (e) {
            console.error('[AI] Connection test failed:', e);
            return false;
        }
    }

    /**
     * Generic generation method with caching and error handling.
     */
    async generate(prompt, type = 'generic', maxTokens = null) {
        if (!this.enabled) {
            console.warn('[AI] Generation skipped: No API Key');
            return null;
        }

        const tokens = maxTokens || this.maxTokens;
        const cacheKey = this.hashCode(prompt);
        if (this.cache.has(cacheKey)) {
            console.log(`[AI] Cache hit for ${type}`);
            return this.cache.get(cacheKey);
        }

        try {
            console.log(`[AI] Generating ${type}...`);

            const response = await fetch(CONFIG.DEEPSEEK_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    model: CONFIG.AI_MODEL,
                    messages: [
                        { role: 'system', content: 'You are a creative RPG content generator. Always respond with valid JSON only, no markdown formatting, no code blocks.' },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: tokens,
                    temperature: 0.8
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            const data = await response.json();
            if (!data.choices?.[0]?.message?.content) {
                throw new Error('Invalid API response structure');
            }

            const content = data.choices[0].message.content;
            let result;
            try {
                // Handle potential markdown code blocks
                const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
                const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
                result = JSON.parse(jsonStr);
            } catch (e) {
                console.warn('[AI] JSON parse failed, returning raw text:', e.message);
                result = { text: content };
            }

            this.cache.set(cacheKey, result);
            console.log(`[AI] Generated ${type} successfully`);
            return result;

        } catch (error) {
            console.error(`[AI] ${type} generation error:`, error);
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

    // ==================== WORLD GENERATION ====================

    async generateWorldLore(seed) {
        const prompt = `Generate a fantasy world for an RPG game. Theme: "${seed || 'mystical medieval'}".
Create a world with: name, description, 5 region names with descriptions, history, current conflicts, and factions.
Respond with JSON:
{
    "worldName": "string",
    "description": "string (2-3 sentences)",
    "theme": "string",
    "regions": [{"name": "string", "description": "string", "biome": "grass|forest|mountain|water|swamp|snow"}],
    "history": "string (2-3 sentences)",
    "conflicts": ["string", "string"],
    "factions": [{"name": "string", "description": "string"}]
}`;
        return await this.generate(prompt, 'World Lore', 800);
    }

    // ==================== NPC GENERATION ====================

    async generateNPC(worldContext, location) {
        const prompt = `Create a unique NPC for a fantasy RPG.
World: ${worldContext}
Location: ${location}
Include name, race, occupation, personality, backstory, dialogue style, greeting, and a quest they might offer.
Respond with JSON:
{
    "name": "string",
    "race": "string (Human/Elf/Dwarf/Halfling/Orc)",
    "occupation": "string",
    "personality": "string (2-3 traits)",
    "backstory": "string (2-3 sentences)",
    "dialogueStyle": "string (how they speak)",
    "greeting": "string (their first words to the player)",
    "quest": {
        "title": "string",
        "description": "string",
        "type": "kill|fetch|deliver|explore",
        "target": "string",
        "targetAmount": 3,
        "rewards": {"xp": 100, "gold": 50}
    }
}`;
        return await this.generate(prompt, 'NPC', 700);
    }

    // ==================== DIALOGUE GENERATION ====================

    async generateDialogue(npcContext, playerMessage, conversationHistory) {
        const history = conversationHistory.slice(-10).map(h => `${h.speaker}: ${h.text}`).join('\n');
        const prompt = `You are an NPC in a fantasy RPG.
NPC: ${npcContext}
Conversation history:
${history}

Player says: "${playerMessage}"

Respond as the NPC in character. Keep response to 1-3 sentences.
Also provide 3 dialogue options for the player.

Respond with JSON:
{
    "response": "string",
    "playerOptions": ["string", "string", "string"],
    "mood": "friendly|neutral|hostile|curious"
}`;
        return await this.generate(prompt, 'Dialogue', 400);
    }

    // ==================== ITEM GENERATION ====================

    async generateItem(type, rarity, worldContext) {
        const rarityMultipliers = { common: 1, uncommon: 1.5, rare: 2, epic: 3, legendary: 5 };
        const mult = rarityMultipliers[rarity] || 1;

        const prompt = `Generate a ${rarity} ${type} item for a fantasy RPG.
World context: ${worldContext}
Create a unique item with a creative name, description, lore/backstory, and appropriate stats.
Stats should scale with rarity (${rarity}, multiplier: ${mult}x).

Respond with JSON:
{
    "name": "string (creative fantasy name)",
    "description": "string (1-2 sentences about the item)",
    "lore": "string (1 sentence of lore/backstory)",
    "type": "${type}",
    "rarity": "${rarity}",
    "stats": {
        ${type === 'weapon' ? '"damage": number (5-50 scaled by rarity)' : ''}
        ${type === 'armor' ? '"defense": number (3-30 scaled by rarity), "hp": number (0-50 scaled by rarity)' : ''}
        ${type === 'accessory' ? '"damage": number (0-10), "defense": number (0-10), "crit": number (0-15)' : ''}
    },
    "value": number (10-500 scaled by rarity)
}`;
        return await this.generate(prompt, 'Item', 400);
    }

    // ==================== QUEST GENERATION ====================

    async generateQuest(playerContext, worldContext) {
        const prompt = `Generate a quest for a fantasy RPG.
Player: ${playerContext}
World: ${worldContext}
Create a quest with title, description, objectives, type, and rewards.
Difficulty should match the player's level.

Respond with JSON:
{
    "title": "string (creative quest title)",
    "description": "string (2-3 sentences)",
    "type": "kill|fetch|deliver|explore",
    "target": "string (what to kill/find/deliver/explore)",
    "targetAmount": number (1-10),
    "rewards": {"xp": number (50-500), "gold": number (20-200)},
    "difficulty": "easy|normal|hard"
}`;
        return await this.generate(prompt, 'Quest', 400);
    }

    // ==================== WORLD EVENT GENERATION ====================

    async generateWorldEvent(worldContext, playerLevel) {
        const prompt = `Generate a dynamic world event for a fantasy RPG.
World: ${worldContext}
Player Level: ${playerLevel}
Create an interesting event (political, natural disaster, magical anomaly, invasion, etc.).

Respond with JSON:
{
    "title": "string (event title)",
    "description": "string (2-3 sentences describing what is happening)",
    "type": "political|natural|magical|invasion|discovery",
    "impact": "string (how it affects the world)",
    "duration": number (60-300 seconds),
    "choices": [
        {"text": "string (player choice 1)", "outcome": "string (what happens)"},
        {"text": "string (player choice 2)", "outcome": "string (what happens)"}
    ]
}`;
        return await this.generate(prompt, 'World Event', 500);
    }
}
