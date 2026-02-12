import { CONFIG } from '../config.js';
import { WEATHER_TYPES } from '../world/world.js';

/**
 * Render System - Canvas rendering with camera, lighting, weather, particles,
 * and floating text support.
 */
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

        // Weather particles (persistent)
        this.weatherParticles = [];

        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.game.width = this.canvas.width;
        this.game.height = this.canvas.height;
        this.lightCanvas.width = this.canvas.width;
        this.lightCanvas.height = this.canvas.height;
    }

    update(dt) {
        const ctx = this.ctx;

        // Clear
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.game.state === 'title' || this.game.state === 'creation' || this.game.state === 'loading') {
            // Draw animated background for menus
            this.renderMenuBackground(ctx, dt);
            return;
        }

        if (this.game.state !== 'playing' && this.game.state !== 'dead') return;

        // Update camera
        if (this.game.player) {
            this.camera.x = this.game.player.x - this.canvas.width / 2;
            this.camera.y = this.game.player.y - this.canvas.height / 2;
        }

        // Draw world tiles
        this.game.world.render(ctx, this.camera);

        // Draw projectiles
        this.game.projectiles.forEach(p => p.render(ctx, this.camera));

        // Draw entities (sorted by Y for depth)
        const sortedEntities = [...this.game.entities].sort((a, b) => a.y - b.y);
        sortedEntities.forEach(entity => {
            // Viewport culling
            const dx = entity.x - this.camera.x;
            const dy = entity.y - this.camera.y;
            if (dx > -100 && dx < this.canvas.width + 100 && dy > -100 && dy < this.canvas.height + 100) {
                entity.render(ctx, this.camera);
            }
        });

        // Draw player (always on top)
        if (this.game.player) {
            this.game.player.render(ctx, this.camera);
        }

        // Draw game particles
        this.renderParticles(ctx);

        // Draw weather
        this.renderWeather(ctx, dt);

        // Draw lighting (day/night)
        this.renderLighting(ctx);

        // Draw floating texts
        this.updateFloatingTexts(dt);
        this.renderFloatingTexts(ctx);

        // Draw interact prompts
        this.renderInteractPrompts(ctx);

        // Draw minimap
        this.renderMinimap(ctx);
    }

    renderMenuBackground(ctx, dt) {
        // Animated starfield
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const t = Date.now() / 1000;
        for (let i = 0; i < 80; i++) {
            const x = ((i * 137.5 + t * (10 + i % 5)) % this.canvas.width);
            const y = ((i * 83.7 + t * (5 + i % 3)) % this.canvas.height);
            const alpha = 0.2 + Math.sin(t + i) * 0.15;
            ctx.fillStyle = `rgba(212, 168, 83, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, 1 + (i % 3), 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderParticles(ctx) {
        this.game.particles.forEach(p => {
            const px = p.x - this.camera.x;
            const py = p.y - this.camera.y;

            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(px, py, p.radius, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    renderWeather(ctx, dt) {
        const weather = this.game.world?.weather || WEATHER_TYPES.CLEAR;
        if (weather === WEATHER_TYPES.CLEAR) return;

        // Generate weather particles if needed
        const count = weather === WEATHER_TYPES.STORM ? 150 : 80;
        while (this.weatherParticles.length < count) {
            this.weatherParticles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                speed: 200 + Math.random() * 300,
                length: weather === WEATHER_TYPES.SNOW ? 2 : 8 + Math.random() * 6
            });
        }

        // Update and draw
        ctx.save();
        if (weather === WEATHER_TYPES.SNOW) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        } else {
            ctx.strokeStyle = weather === WEATHER_TYPES.STORM
                ? 'rgba(150, 150, 255, 0.6)'
                : 'rgba(100, 100, 255, 0.4)';
            ctx.lineWidth = 1;
        }

        ctx.beginPath();
        this.weatherParticles.forEach(p => {
            p.y += p.speed * dt;
            if (weather !== WEATHER_TYPES.SNOW) {
                p.x += p.speed * 0.3 * dt;
            } else {
                p.x += Math.sin(Date.now() / 1000 + p.y * 0.01) * 20 * dt;
            }

            // Wrap around
            if (p.y > this.canvas.height) { p.y = -10; p.x = Math.random() * this.canvas.width; }
            if (p.x > this.canvas.width) p.x = 0;

            if (weather === WEATHER_TYPES.SNOW) {
                ctx.moveTo(p.x, p.y);
                ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            } else {
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + 1, p.y + p.length);
            }
        });

        if (weather === WEATHER_TYPES.SNOW) {
            ctx.fill();
        } else {
            ctx.stroke();
        }

        // Storm lightning flash
        if (weather === WEATHER_TYPES.STORM && Math.random() < 0.002) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        ctx.restore();
    }

    renderLighting(ctx) {
        const ambient = this.game.world?.getAmbientLight() ?? 1.0;
        const darkness = 1.0 - ambient;

        if (darkness <= 0.05) return;

        this.lightCtx.clearRect(0, 0, this.lightCanvas.width, this.lightCanvas.height);

        // Fill with darkness
        this.lightCtx.globalCompositeOperation = 'source-over';
        this.lightCtx.fillStyle = `rgba(0, 0, 30, ${darkness * 0.85})`;
        this.lightCtx.fillRect(0, 0, this.lightCanvas.width, this.lightCanvas.height);

        // Cut holes for lights
        this.lightCtx.globalCompositeOperation = 'destination-out';

        // Player torch light
        if (this.game.player) {
            const px = this.game.player.x - this.camera.x;
            const py = this.game.player.y - this.camera.y;
            const radius = 180;

            const grad = this.lightCtx.createRadialGradient(px, py, 20, px, py, radius);
            grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
            grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.5)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            this.lightCtx.fillStyle = grad;
            this.lightCtx.beginPath();
            this.lightCtx.arc(px, py, radius, 0, Math.PI * 2);
            this.lightCtx.fill();
        }

        // NPC/Town lights
        this.game.entities.forEach(e => {
            if (e.constructor.name === 'NPC' || e.constructor.name === 'Interactable') {
                const ex = e.x - this.camera.x;
                const ey = e.y - this.camera.y;
                if (ex < -200 || ex > this.canvas.width + 200 || ey < -200 || ey > this.canvas.height + 200) return;

                const r = 60;
                const grad = this.lightCtx.createRadialGradient(ex, ey, 5, ex, ey, r);
                grad.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                this.lightCtx.fillStyle = grad;
                this.lightCtx.beginPath();
                this.lightCtx.arc(ex, ey, r, 0, Math.PI * 2);
                this.lightCtx.fill();
            }
        });

        ctx.drawImage(this.lightCanvas, 0, 0);
    }

    renderInteractPrompts(ctx) {
        if (!this.game.player || this.game.dialogue?.active) return;

        const px = this.game.player.x;
        const py = this.game.player.y;

        this.game.entities.forEach(e => {
            const dist = Math.hypot(e.x - px, e.y - py);
            if (dist > 60) return;

            const ex = e.x - this.camera.x;
            const ey = e.y - this.camera.y;

            if (e.constructor.name === 'NPC') {
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(ex - 30, ey - 40, 60, 16);
                ctx.fillStyle = '#d4a853';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('[E] Talk', ex, ey - 28);
            } else if (e.constructor.name === 'Interactable' && !e.opened) {
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(ex - 30, ey - 40, 60, 16);
                ctx.fillStyle = '#d4a853';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('[E] Open', ex, ey - 28);
            }
        });
    }

    renderMinimap(ctx) {
        const size = 120;
        const padding = 10;
        const x = this.canvas.width - size - padding;
        const y = this.canvas.height - size - padding - 70; // Above hotbar
        const scale = size / (CONFIG.WORLD_SIZE * CONFIG.TILE_SIZE);

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x - 2, y - 2, size + 4, size + 4);
        ctx.strokeStyle = '#3a3a4a';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 2, y - 2, size + 4, size + 4);

        // Tiles (simplified - every 4th tile)
        const step = 4;
        const tileScale = size / CONFIG.WORLD_SIZE;
        for (let ty = 0; ty < CONFIG.WORLD_SIZE; ty += step) {
            for (let tx = 0; tx < CONFIG.WORLD_SIZE; tx += step) {
                if (this.game.world.tiles[ty]?.[tx]) {
                    ctx.fillStyle = CONFIG.COLORS[this.game.world.tiles[ty][tx].biome] || '#000';
                    ctx.fillRect(x + tx * tileScale, y + ty * tileScale, tileScale * step, tileScale * step);
                }
            }
        }

        // Entities (dots)
        this.game.entities.forEach(e => {
            const ex = x + (e.x / CONFIG.TILE_SIZE) * tileScale;
            const ey = y + (e.y / CONFIG.TILE_SIZE) * tileScale;
            if (e.constructor.name === 'Enemy') {
                ctx.fillStyle = '#ff4444';
            } else if (e.constructor.name === 'NPC') {
                ctx.fillStyle = '#bd93f9';
            } else {
                return;
            }
            ctx.fillRect(ex - 1, ey - 1, 2, 2);
        });

        // Player
        if (this.game.player) {
            const px = x + (this.game.player.x / CONFIG.TILE_SIZE) * tileScale;
            const py = y + (this.game.player.y / CONFIG.TILE_SIZE) * tileScale;
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    addFloatingText(text, x, y, color = '#fff') {
        this.floatingTexts.push({
            text, x, y, color,
            life: 1.2,
            vy: -30
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

            ctx.globalAlpha = Math.max(0, ft.life / 1.2);
            ctx.fillStyle = '#000';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(ft.text, px + 1, py + 1);
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, px, py);
            ctx.globalAlpha = 1;
        });
    }
}
