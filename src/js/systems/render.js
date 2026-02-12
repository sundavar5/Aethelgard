import { CONFIG } from '../config.js';
import { WEATHER_TYPES } from '../world/world.js';

export class Render {
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.camera = { x: 0, y: 0 };
        this.floatingTexts = [];
        this.resize();

        // Offscreen canvas for lighting
        this.lightCanvas = document.createElement('canvas');
        this.lightCtx = this.lightCanvas.getContext('2d');
        this.resizeLightCanvas();

        window.addEventListener('resize', () => {
            this.resize();
            this.resizeLightCanvas();
        });
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.game.width = this.canvas.width;
        this.game.height = this.canvas.height;
    }

    resizeLightCanvas() {
        this.lightCanvas.width = this.canvas.width;
        this.lightCanvas.height = this.canvas.height;
    }

    update(dt) {
        // Clear main canvas
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

        // Draw Particles (Weather)
        this.renderWeather(this.ctx);

        // Draw Lighting
        this.renderLighting(this.ctx);

        // Draw floating texts (UI layer)
        this.updateFloatingTexts(dt);
        this.renderFloatingTexts(this.ctx);
    }

    renderWeather(ctx) {
        const w = this.game.world ? this.game.world.weather : WEATHER_TYPES.CLEAR;

        if (w === WEATHER_TYPES.CLEAR) return;

        ctx.save();
        ctx.strokeStyle = w === WEATHER_TYPES.RAIN ? 'rgba(100, 100, 255, 0.5)' : 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = w === WEATHER_TYPES.SNOW ? 2 : 1;

        const numParticles = w === WEATHER_TYPES.STORM ? 100 : 50;

        ctx.beginPath();
        for (let i = 0; i < numParticles; i++) {
            // Random positions for simple effect
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            const len = w === WEATHER_TYPES.SNOW ? 2 : 10;
            const angle = w === WEATHER_TYPES.SNOW ? Math.PI / 2 + (Math.random() - 0.5) : Math.PI / 3;

            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
        }
        ctx.stroke();
        ctx.restore();
    }

    renderLighting(ctx) {
        const ambient = this.game.world ? this.game.world.getAmbientLight() : 1.0;
        const darkness = 1.0 - ambient;

        if (darkness <= 0.05) return; // Full daylight

        // Clear light canvas
        this.lightCtx.clearRect(0, 0, this.lightCanvas.width, this.lightCanvas.height);

        // Fill with darkness
        this.lightCtx.globalCompositeOperation = 'source-over';
        this.lightCtx.fillStyle = `rgba(0, 0, 0, ${darkness * 0.9})`; // Max darkness 90%
        this.lightCtx.fillRect(0, 0, this.lightCanvas.width, this.lightCanvas.height);

        // Cut holes for lights
        this.lightCtx.globalCompositeOperation = 'destination-out';

        // Player Light
        if (this.game.player) {
            const px = this.game.player.x - this.camera.x;
            const py = this.game.player.y - this.camera.y;
            const radius = 150; // Torch radius

            const grad = this.lightCtx.createRadialGradient(px, py, 20, px, py, radius);
            grad.addColorStop(0, 'rgba(0, 0, 0, 1)'); // Opaque erases fully
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Transparent erases nothing

            this.lightCtx.fillStyle = grad;
            this.lightCtx.beginPath();
            this.lightCtx.arc(px, py, radius, 0, Math.PI * 2);
            this.lightCtx.fill();
        }

        // Draw light canvas over main canvas
        ctx.drawImage(this.lightCanvas, 0, 0);
    }

    addFloatingText(text, x, y, color = '#fff') {
        this.floatingTexts.push({
            text,
            x,
            y,
            color,
            life: 1.0,
            vy: -20
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
