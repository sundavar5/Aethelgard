export class Inventory {
    constructor(game) {
        this.game = game;
        this.items = [];
        this.maxSize = 30;
        this.equipped = {
            weapon: null,
            armor: null,
            accessory: null
        };

        // Initial test item
        // this.add(new Item(game, 0, 0, 'potion'));
    }

    add(item) {
        if (this.items.length >= this.maxSize) {
            this.game.ui.notify('Inventory Full', 'error');
            return false;
        }

        // Stack logic?
        if (item.type === 'gold') {
            this.game.player.gold += item.value;
            this.game.ui.notify(`+${item.value} Gold`, 'success');
            return true;
        }

        this.items.push(item);
        this.updateUI();
        return true;
    }

    remove(item) {
        const index = this.items.indexOf(item);
        if (index > -1) {
            this.items.splice(index, 1);
            this.updateUI();
        }
    }

    use(item) {
        if (!item) return;

        if (item.type === 'potion') {
            if (this.game.player.hp < this.game.player.maxHp) {
                this.game.player.hp = Math.min(this.game.player.maxHp, this.game.player.hp + (item.stats.healing || 50));
                this.remove(item);
                this.game.ui.notify('Used Potion', 'success');
            } else {
                this.game.ui.notify('HP already full', 'info');
            }
        } else if (['sword', 'bow', 'staff'].includes(item.type)) {
            this.equip(item, 'weapon');
        } else if (['light', 'medium', 'heavy'].includes(item.type)) {
            this.equip(item, 'armor');
        }
    }

    equip(item, slot) {
        // Unequip current
        if (this.equipped[slot]) {
            this.items.push(this.equipped[slot]);
        }

        this.remove(item);
        this.equipped[slot] = item;
        this.game.ui.notify(`Equipped ${item.name}`, 'success');

        // Update stats
        this.game.player.updateStats();
    }

    updateUI() {
        // Assume UI system handles rendering inventory grid
        if (this.game.ui) this.game.ui.updateInventory(this.items);
    }
}
