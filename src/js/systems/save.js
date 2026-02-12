export class SaveSystem {
    constructor(game) {
        this.game = game;
        this.key = 'aethelgard_reforged_save';
        this.version = '1.0.0';
    }

    save() {
        if (!this.game.player) return;

        try {
            const data = {
                version: this.version,
                player: {
                    x: this.game.player.x,
                    y: this.game.player.y,
                    hp: this.game.player.hp,
                    maxHp: this.game.player.maxHp,
                    mp: this.game.player.mp,
                    xp: this.game.player.xp,
                    level: this.game.player.level,
                    gold: this.game.player.gold,
                    stats: {
                        damage: this.game.player.damage,
                        defense: this.game.player.defense
                    }
                },
                inventory: this.game.inventory.items.map(i => ({ type: i.type, amount: i.amount || 1, name: i.name, rarity: i.rarity })),
                quests: this.game.questSystem.activeQuests, // Correct reference
                timestamp: Date.now()
            };

            localStorage.setItem(this.key, JSON.stringify(data));
            this.game.ui.notify('Game Saved', 'success');
        } catch (e) {
            console.error('Save failed:', e);
            this.game.ui.notify('Save failed!', 'error');
        }
    }

    load() {
        const saved = localStorage.getItem(this.key);
        if (!saved) {
            this.game.ui.notify('No save found', 'error');
            return false;
        }

        try {
            const data = JSON.parse(saved);

            // Version check could go here
            if (data.version !== this.version) {
                console.warn('Save version mismatch. Attempting to load anyway.');
            }

            // Reconstruct game state
            this.game.init(); // Reset first to clean state

            if (this.game.player) {
                this.game.player.x = data.player.x || this.game.player.x;
                this.game.player.y = data.player.y || this.game.player.y;
                this.game.player.hp = data.player.hp || this.game.player.hp;
                this.game.player.mp = data.player.mp || this.game.player.mp;
                this.game.player.xp = data.player.xp || 0;
                this.game.player.level = data.player.level || 1;
                this.game.player.gold = data.player.gold || 0;
            }

            // Reconstruct inventory
            this.game.inventory.items = []; // Clear default
            if (data.inventory) {
                data.inventory.forEach(itemData => {
                    // Need to reconstruct Item objects or plain objects if Inventory handles it
                    // Assuming Inventory handles plain objects for now or we create new Items
                    // For simplicity, we push plain objects and let Inventory.use/equip handle it
                    // Ideally we should use `new Item(...)` but we need x,y which are irrelevant for inventory
                    this.game.inventory.items.push(itemData);
                });
            }

            // Restore Quests
            if (data.quests) {
                this.game.questSystem.activeQuests = data.quests;
            }

            this.game.ui.notify('Game Loaded', 'success');
            return true;
        } catch (e) {
            console.error('Load failed:', e);
            this.game.ui.notify('Save file corrupted', 'error');
            return false;
        }
    }

    reset() {
        localStorage.removeItem(this.key);
        // Also remove old key just in case
        localStorage.removeItem('aethelgard_save');
        console.log('Save data cleared.');
    }
}
