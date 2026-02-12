import { CONFIG } from '../config.js';

export class Render {
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.camera = { x: 0, y: 0 };
        this.floatingTexts = [];
        this.resize();

        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.game.width = this.canvas.width;
        this.game.height = this.canvas.height;
    }

    update(dt) {
        // Clear canvas
        this.ctx.fillStyle = CONFIG.COLORS.grass;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Update camera
        if (this.game.player) {
            this.camera.x = this.game.player.x - this.canvas.width / 2;
            this.camera.y = this.game.player.y - this.canvas.height / 2;
        }

        // Draw world
        this.game.world.render(this.ctx, this.camera);

        // Draw entities
        this.game.entities.forEach(entity => entity.render(this.ctx, this.camera));
        if (this.game.player) this.game.player.render(this.ctx, this.camera);

        // Draw floating texts
        this.updateFloatingTexts(dt);
        this.renderFloatingTexts(this.ctx);
    }

    addFloatingText(text, x, y, color = '#fff') {
        this.floatingTexts.push({
            text,
            x,
            y,
            color,
            life: 1.0,
            vy: -20 // Move up
        });
    }

    updateFloatingTexts(dt) {
        this.floatingTexts.forEach(ft => {
            ft.life -= dt;
            ft.y += ft.vy * dt;
        });
        this.floatingTexts = this.floatingTexts.filter(ft => ft.life > 0);
    }

    renderFloatingTexts(ctx) {
        this.floatingTexts.forEach(ft => {
            const px = ft.x - this.camera.x;
            const py = ft.y - this.camera.y;

            ctx.globalAlpha = Math.max(0, ft.life);
            ctx.fillStyle = ft.color;
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(ft.text, px, py);
            ctx.globalAlpha = 1.0;
        });
    }
}
