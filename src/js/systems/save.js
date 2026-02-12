export class SaveSystem {
    constructor(game) {
        this.game = game;
        this.key = 'aethelgard_reforged_save';
    }

    save() {
        if (!this.game.player) return;

        const data = {
            player: {
                x: this.game.player.x,
                y: this.game.player.y,
                hp: this.game.player.hp,
                maxHp: this.game.player.maxHp,
                xp: this.game.player.xp,
                level: this.game.player.level,
                gold: this.game.player.gold,
                stats: this.game.player.stats
            },
            inventory: this.game.inventory.items.map(i => ({ type: i.type, amount: i.amount })),
            quests: this.game.quests.activeQuests,
            timestamp: Date.now()
        };

        localStorage.setItem(this.key, JSON.stringify(data));
        this.game.ui.notify('Game Saved', 'success');
    }

    load() {
        const saved = localStorage.getItem(this.key);
        if (!saved) {
            this.game.ui.notify('No save found', 'error');
            return false;
        }

        try {
            const data = JSON.parse(saved);

            // Reconstruct game state
            this.game.init(); // Reset first

            if (this.game.player) {
                this.game.player.x = data.player.x;
                this.game.player.y = data.player.y;
                this.game.player.hp = data.player.hp;
                this.game.player.xp = data.player.xp;
                this.game.player.level = data.player.level;
                this.game.player.gold = data.player.gold;
            }

            // Reconstruct inventory
            // Need to map back to Item objects

            this.game.ui.notify('Game Loaded', 'success');
            return true;
        } catch (e) {
            console.error('Load failed:', e);
            this.game.ui.notify('Save file corrupted', 'error');
            return false;
        }
    }
}
