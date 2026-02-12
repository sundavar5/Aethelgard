/**
 * Event System - Dynamic world events that happen periodically.
 * Events can be AI-generated or fallback procedural events.
 */
export class EventSystem {
    constructor(game) {
        this.game = game;
        this.events = [];
        this.activeEvent = null;
        this.eventTimer = 120 + Math.random() * 180; // First event in 2-5 minutes
        this.eventCooldown = 0;
        this.history = [];
    }

    update(dt) {
        // Countdown to next event
        this.eventTimer -= dt;
        if (this.eventTimer <= 0 && !this.activeEvent) {
            this.triggerEvent();
            this.eventTimer = 180 + Math.random() * 300; // 3-8 minutes between events
        }

        // Update active event
        if (this.activeEvent) {
            this.activeEvent.remaining -= dt;
            if (this.activeEvent.remaining <= 0) {
                this.endEvent();
            }
        }
    }

    async triggerEvent() {
        let eventData = null;

        if (this.game.ai.enabled) {
            const worldCtx = this.game.worldLore
                ? `${this.game.worldLore.worldName} - ${this.game.worldLore.description}`
                : 'A fantasy world';
            eventData = await this.game.ai.generateWorldEvent(worldCtx, this.game.player?.level || 1);
        }

        if (!eventData) {
            eventData = this.generateFallbackEvent();
        }

        this.activeEvent = {
            ...eventData,
            remaining: eventData.duration || 120,
            startTime: Date.now()
        };

        this.history.push({ title: eventData.title, day: this.game.world.day });

        // Show banner
        this.game.ui.showEventBanner(
            eventData.title,
            eventData.description,
            this.getEventIcon(eventData.type)
        );

        this.game.ui.notify(`World Event: ${eventData.title}`, 'ai');
        this.game.ui.addChatMessage('system', 'World Event', eventData.description);

        // Apply event effects
        this.applyEventEffects(eventData);
    }

    endEvent() {
        if (this.activeEvent) {
            this.game.ui.notify(`Event ended: ${this.activeEvent.title}`, 'info');
            this.removeEventEffects(this.activeEvent);
            this.activeEvent = null;
        }
    }

    applyEventEffects(event) {
        switch (event.type) {
            case 'invasion':
                // Spawn extra enemies
                for (let i = 0; i < 5; i++) {
                    this.game.world.spawnEnemies(1);
                }
                break;
            case 'natural':
                // Change weather
                this.game.world.weather = 'storm';
                this.game.world.weatherTimer = event.duration || 120;
                break;
            case 'magical':
                // Buff player temporarily
                if (this.game.player) {
                    this.game.player._eventMagicBuff = true;
                    this.game.player.magicDamage *= 1.5;
                }
                break;
            case 'discovery':
                // Spawn a special item
                this.game.world.spawnItems(2);
                break;
            case 'political':
                // Notify only, narrative effect
                break;
        }
    }

    removeEventEffects(event) {
        switch (event.type) {
            case 'magical':
                if (this.game.player?._eventMagicBuff) {
                    this.game.player.magicDamage /= 1.5;
                    this.game.player._eventMagicBuff = false;
                }
                break;
        }
    }

    generateFallbackEvent() {
        const events = [
            {
                title: 'Bandit Raid',
                description: 'A group of bandits has been spotted roaming the countryside. Stay alert!',
                type: 'invasion',
                impact: 'More enemies appear temporarily.',
                duration: 90
            },
            {
                title: 'Thunderstorm',
                description: 'Dark clouds gather overhead. A fierce storm approaches.',
                type: 'natural',
                impact: 'Heavy weather affects visibility.',
                duration: 120
            },
            {
                title: 'Arcane Surge',
                description: 'A rift in the magical weave empowers all spellcasters.',
                type: 'magical',
                impact: 'Magic damage increased by 50%.',
                duration: 60
            },
            {
                title: 'Lost Treasure',
                description: 'Rumors spread of ancient treasure recently uncovered.',
                type: 'discovery',
                impact: 'New items appear in the world.',
                duration: 150
            },
            {
                title: 'Political Upheaval',
                description: 'A local lord has been overthrown. The region is in turmoil.',
                type: 'political',
                impact: 'NPC attitudes may shift.',
                duration: 180
            },
            {
                title: 'Blood Moon',
                description: 'The moon turns crimson. Creatures grow restless and aggressive.',
                type: 'invasion',
                impact: 'Enemies are stronger temporarily.',
                duration: 100
            }
        ];

        return events[Math.floor(Math.random() * events.length)];
    }

    getEventIcon(type) {
        const icons = {
            political: '\ud83c\udff0',
            natural: '\u26c8\ufe0f',
            magical: '\u2728',
            invasion: '\u2694\ufe0f',
            discovery: '\ud83d\uddfa\ufe0f'
        };
        return icons[type] || '\u2728';
    }
}
