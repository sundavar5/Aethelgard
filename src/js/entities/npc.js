export class NPC {
    constructor(game, x, y, aiData = null) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.radius = 10;
        this.speed = 30;
        this.aiData = aiData;

        if (aiData) {
            this.name = aiData.name;
            this.race = aiData.race;
            this.occupation = aiData.occupation;
            this.personality = aiData.personality;
            this.backstory = aiData.backstory;
            this.greeting = aiData.greeting;
            this.quest = aiData.quest;
        } else {
            // Fallback
            this.name = 'Villager';
            this.race = 'Human';
            this.occupation = 'Peasant';
            this.personality = 'Simple';
            this.backstory = 'Just living a simple life.';
            this.greeting = 'Hello there!';
            this.quest = null;
        }

        this.conversationHistory = [];
        this.state = 'idle';
        this.vx = 0;
        this.vy = 0;
        this.timer = 0;

        // Ensure they persist
        this.active = true;
        this.hp = 100; // Invulnerable dummy HP
    }

    update(dt) {
        // Simple wander AI
        this.timer -= dt;
        if (this.timer <= 0) {
            this.timer = 2 + Math.random() * 3;
            if (Math.random() < 0.5) {
                this.vx = (Math.random() - 0.5) * this.speed;
                this.vy = (Math.random() - 0.5) * this.speed;
                this.state = 'wander';
            } else {
                this.vx = 0;
                this.vy = 0;
                this.state = 'idle';
            }
        }

        if (this.state === 'wander') {
            const nextX = this.x + this.vx * dt;
            const nextY = this.y + this.vy * dt;
            if (!this.game.checkCollision(nextX, nextY)) {
                this.x = nextX;
                this.y = nextY;
            } else {
                this.vx = -this.vx;
                this.vy = -this.vy;
            }
        }
    }

    async talk(playerMessage) {
        if (!this.game.ai.enabled || !this.aiData) {
            return {
                response: this.greeting,
                playerOptions: ['Tell me about yourself.', 'Do you have any quests?', 'Goodbye.'],
                mood: 'neutral'
            };
        }

        const npcContext = `${this.name}, ${this.race} ${this.occupation}. Personality: ${this.personality}. Backstory: ${this.backstory}`;
        return await this.game.ai.generateDialogue(npcContext, playerMessage, this.conversationHistory);
    }

    addToHistory(speaker, text) {
        this.conversationHistory.push({ speaker, text });
        if (this.conversationHistory.length > 20) this.conversationHistory.shift();
    }

    render(ctx, camera) {
        const px = this.x - camera.x;
        const py = this.y - camera.y;

        ctx.fillStyle = '#bd93f9';
        ctx.beginPath();
        ctx.arc(px, py, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Name
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, px, py - 15);

        // Quest marker
        if (this.quest) {
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(px, py - 25, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
