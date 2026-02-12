export class Interactable {
    constructor(game, x, y, type) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.type = type; // 'chest', 'door', 'sign'
        this.active = true;
        this.radius = 16;

        if (type === 'chest') {
            this.loot = [
                { type: 'gold', amount: 50 },
                { type: 'potion', amount: 1 }
            ];
            this.opened = false;
        }
    }

    update(dt) {
        // Interaction logic handled by Player or Input system
        // But we can check proximity for prompt
        const player = this.game.player;
        if (!player) return;

        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        if (dist < 40 && !this.opened) {
            // Show prompt
            // this.game.ui.showPrompt('Press E to Open');
            if (this.game.input.isDown('KeyE')) {
                this.interact();
            }
        }
    }

    interact() {
        if (this.type === 'chest' && !this.opened) {
            this.opened = true;
            this.game.ui.notify('Chest Opened!', 'success');

            // Give loot
            this.loot.forEach(item => {
                if (item.type === 'gold') {
                    this.game.player.gold += item.amount;
                    this.game.ui.notify(`Found ${item.amount} Gold`, 'loot');
                } else {
                    // Add item to inventory
                    // Need to create Item entity or just add directly
                    // For now, simple logic
                    this.game.inventory.add({ ...item, name: item.type, rarity: 'common' }); // Mock item
                    this.game.ui.notify(`Found ${item.type}`, 'loot');
                }
            });
        }
    }

    render(ctx, camera) {
        const px = this.x - camera.x;
        const py = this.y - camera.y;

        if (this.type === 'chest') {
            ctx.fillStyle = this.opened ? '#8b4513' : '#d2691e';
            ctx.fillRect(px - 10, py - 10, 20, 20);

            // Lid detail
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(px - 2, py - 5, 4, 10); // Lock
        }
    }
}
