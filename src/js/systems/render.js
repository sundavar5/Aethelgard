import { CONFIG } from '../config.js';
import { WEATHER_TYPES } from '../world/world.js';

export class Render {
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.camera = { x: 0, y: 0 };
        this.floatingTexts = [];
        this.particles = [];
        this.shake = { x: 0, y: 0, time: 0, intensity: 0 };

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

    triggerShake(intensity, duration) {
        this.shake.intensity = intensity;
        this.shake.time = duration;
    }

    addParticle(x, y, color, speed, life, size = 3) {
        const angle = Math.random() * Math.PI * 2;
        this.particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color,
            life,
            maxLife: life,
            size
        });
    }

    update(dt) {
        // Update Shake
        if (this.shake.time > 0) {
            this.shake.time -= dt;
            const k = this.shake.intensity * (this.shake.time > 0 ? 1 : 0);
            this.shake.x = (Math.random() - 0.5) * k;
            this.shake.y = (Math.random() - 0.5) * k;
        } else {
            this.shake.x = 0;
            this.shake.y = 0;
        }

        // Update Particles
        this.particles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            p.size *= 0.95; // Shrink
        });
        this.particles = this.particles.filter(p => p.life > 0);

        // Update Floating Texts
        this.updateFloatingTexts(dt);

        // --- RENDER START ---

        // Clear main canvas
        this.ctx.fillStyle = CONFIG.COLORS.grass;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        // Apply Shake
        this.ctx.translate(this.shake.x, this.shake.y);

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

        // Draw Particles (Game World)
        this.renderParticles(this.ctx);

        // Draw Weather (Overlay)
        this.renderWeather(this.ctx);

        // Draw Lighting (Overlay)
        this.renderLighting(this.ctx);

        this.ctx.restore(); // Restore shake

        // Draw floating texts (UI layer, no shake usually but could apply)
        this.renderFloatingTexts(this.ctx);
    }

    renderParticles(ctx) {
        this.particles.forEach(p => {
            const px = p.x - this.camera.x;
            const py = p.y - this.camera.y;

            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(px, py, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        });
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

        if (darkness <= 0.05) return;

        this.lightCtx.clearRect(0, 0, this.lightCanvas.width, this.lightCanvas.height);

        this.lightCtx.globalCompositeOperation = 'source-over';
        this.lightCtx.fillStyle = `rgba(0, 0, 0, ${darkness * 0.9})`;
        this.lightCtx.fillRect(0, 0, this.lightCanvas.width, this.lightCanvas.height);

        this.lightCtx.globalCompositeOperation = 'destination-out';

        if (this.game.player) {
            const px = this.game.player.x - this.camera.x;
            const py = this.game.player.y - this.camera.y;
            const radius = 150;

            const grad = this.lightCtx.createRadialGradient(px, py, 20, px, py, radius);
            grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            this.lightCtx.fillStyle = grad;
            this.lightCtx.beginPath();
            this.lightCtx.arc(px, py, radius, 0, Math.PI * 2);
            this.lightCtx.fill();
        }

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
