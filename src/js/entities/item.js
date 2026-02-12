export class Item {
    constructor(game, x, y, type, aiData = null) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.type = type;
        this.active = true;
        this.bobOffset = Math.random() * Math.PI * 2;

        if (aiData) {
            this.name = aiData.name;
            this.description = aiData.description;
            this.rarity = aiData.rarity;
            this.stats = aiData.stats || {};
            this.value = aiData.value || 10;
        } else {
            // Fallbacks
            if (type === 'gold') {
                this.name = 'Gold';
                this.rarity = 'common';
                this.value = 10;
            } else if (type === 'potion') {
                this.name = 'Health Potion';
                this.rarity = 'common';
                this.value = 50;
                this.stats = { healing: 50 };
            } else if (type === 'sword') {
                this.name = 'Iron Sword';
                this.rarity = 'common';
                this.value = 100;
                this.stats = { damage: 10 };
            }
        }

        this.color = this.getRarityColor(this.rarity);
    }

    getRarityColor(rarity) {
        const colors = {
            common: '#888',
            uncommon: '#44ff44',
            rare: '#4444ff',
            epic: '#aa44ff',
            legendary: '#ffaa00'
        };
        return colors[rarity] || '#888';
    }

    update(dt) {
        // Floating animation
        // Collision with player for pickup
        const player = this.game.player;
        if (player) {
            const dist = Math.hypot(player.x - this.x, player.y - this.y);
            if (dist < 20) {
                this.game.inventory.add(this);
                this.active = false;
                this.game.ui.notify(`Picked up ${this.name}`, 'success');
            }
        }
    }

    render(ctx, camera) {
        if (!this.active) return;

        const px = this.x - camera.x;
        const py = this.y - camera.y + Math.sin(Date.now() / 500 + this.bobOffset) * 5;

        // Glow
        const grad = ctx.createRadialGradient(px, py, 2, px, py, 15);
        grad.addColorStop(0, this.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, 15, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}
