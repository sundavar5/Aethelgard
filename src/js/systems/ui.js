export class UI {
    constructor(game) {
        this.game = game;
        this.game.ui = this; // Attach self to game

        // References
        this.hud = document.getElementById('hud');
        this.hpBar = document.getElementById('hp-bar');
        this.hpText = document.getElementById('hp-text');
        this.mpBar = document.getElementById('mp-bar');
        this.mpText = document.getElementById('mp-text');
        this.stBar = document.getElementById('st-bar');
        this.stText = document.getElementById('st-text');
        this.hotbar = document.getElementById('hotbar');
        this.notificationArea = document.getElementById('notification-area');

        // Minimap
        this.minimapCanvas = document.getElementById('minimap-canvas');
        this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

        // Create Status Effects Container
        this.statusContainer = document.createElement('div');
        this.statusContainer.id = 'status-effects';
        this.statusContainer.style.position = 'absolute';
        this.statusContainer.style.top = '60px'; // Below bars
        this.statusContainer.style.left = '20px';
        this.statusContainer.style.display = 'flex';
        this.statusContainer.style.gap = '5px';
        this.hud.appendChild(this.statusContainer);

        this.initEventListeners();
        this.createHotbar();
    }

    initEventListeners() {
        const btnNew = document.getElementById('btn-new-game');
        if (btnNew) {
            btnNew.onclick = () => {
                this.showLoading();
                setTimeout(() => {
                    this.game.init();
                    this.hideLoading();
                    this.showHUD();
                }, 100);
            };
        }

        const btnLoad = document.getElementById('btn-load-game');
        if (btnLoad) {
            btnLoad.onclick = () => {
                this.showLoading();
                setTimeout(() => {
                    if (this.game.saveSystem.load()) {
                        this.hideLoading();
                        this.showHUD();
                    } else {
                        this.hideLoading();
                    }
                }, 100);
            };
        }

        const btnReset = document.getElementById('btn-reset-save');
        if (btnReset) {
            btnReset.onclick = () => {
                this.game.saveSystem.reset();
                this.notify('Save data reset', 'info');
            };
        }
    }

    showLoading() {
        document.getElementById('title-screen').classList.add('hidden');
        document.getElementById('loading-screen').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading-screen').classList.add('hidden');
    }

    showHUD() {
        document.getElementById('hud').classList.remove('hidden');
    }

    createHotbar() {
        if (!this.hotbar) return;
        this.hotbar.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const slot = document.createElement('div');
            slot.className = 'hotbar-slot';
            slot.textContent = i + 1;
            slot.onclick = () => this.game.player.selectSlot(i);
            this.hotbar.appendChild(slot);
        }
    }

    update(dt) {
        if (!this.game.player) return;

        const p = this.game.player;
        if (this.hpBar) {
            this.hpBar.style.width = `${Math.max(0, (p.hp / p.maxHp) * 100)}%`;
            this.hpText.textContent = `HP ${Math.ceil(p.hp)}/${p.maxHp}`;
        }
        if (this.mpBar) {
            this.mpBar.style.width = `${Math.max(0, (p.mp / p.maxMp) * 100)}%`;
            this.mpText.textContent = `MP ${Math.ceil(p.mp)}/${p.maxMp}`;
        }
        if (this.stBar) {
            this.stBar.style.width = `${Math.max(0, (p.stamina / p.maxStamina) * 100)}%`;
            this.stText.textContent = `ST ${Math.ceil(p.stamina)}/${p.maxStamina}`;
        }

        this.updateStatusEffects();
        this.updateMinimap();
    }

    updateMinimap() {
        if (!this.minimapCtx || !this.game.world) return;

        const ctx = this.minimapCtx;
        const w = this.minimapCanvas.width;
        const h = this.minimapCanvas.height;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        const mapScale = 4; // Zoom level
        const player = this.game.player;

        // Draw world centered on player
        const startX = Math.floor(player.x / this.game.world.tileSize) - (w / 2 / mapScale);
        const startY = Math.floor(player.y / this.game.world.tileSize) - (h / 2 / mapScale);

        for (let y = 0; y < h / mapScale; y++) {
            for (let x = 0; x < w / mapScale; x++) {
                const tile = this.game.world.getTile(startX + x, startY + y);
                if (tile) {
                    // Simple colors for minimap
                    const colors = {
                        grass: '#3d6a4a', forest: '#2d4a3a', water: '#3a5a8a',
                        mountain: '#6a5a4a', town: '#d4a853', snow: '#fff'
                    };
                    ctx.fillStyle = colors[tile.biome] || '#333';
                    ctx.fillRect(x * mapScale, y * mapScale, mapScale, mapScale);
                }
            }
        }

        // Draw Player
        ctx.fillStyle = '#f00';
        ctx.fillRect(w / 2 - 2, h / 2 - 2, 4, 4);

        // Draw Enemies (dots)
        this.game.entities.forEach(e => {
            if (e.constructor.name === 'Enemy') {
                const rx = (e.x - player.x) / this.game.world.tileSize * mapScale + w / 2;
                const ry = (e.y - player.y) / this.game.world.tileSize * mapScale + h / 2;
                if (rx >= 0 && rx < w && ry >= 0 && ry < h) {
                    ctx.fillStyle = '#ff0';
                    ctx.fillRect(rx - 1, ry - 1, 2, 2);
                }
            }
        });
    }

    updateStatusEffects() {
        if (!this.game.player) return;

        this.statusContainer.innerHTML = '';

        this.game.player.statusEffects.forEach(effect => {
            const el = document.createElement('div');
            el.className = 'status-icon';
            el.textContent = effect.type[0].toUpperCase();
            el.title = `${effect.type}`;

            const colors = { poison: '#0f0', burn: '#f00', freeze: '#00f', stun: '#ff0' };
            el.style.backgroundColor = colors[effect.type] || '#fff';
            el.style.width = '24px';
            el.style.height = '24px';
            el.style.borderRadius = '50%';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.fontSize = '12px';
            el.style.fontWeight = 'bold';
            el.style.color = '#000';
            el.style.border = '1px solid #fff';

            this.statusContainer.appendChild(el);
        });
    }

    notify(message, type = 'info') {
        if (!this.notificationArea) return;

        const notif = document.createElement('div');
        notif.className = `notification ${type}`;
        notif.textContent = message;

        notif.style.background = 'rgba(0,0,0,0.85)';
        notif.style.color = '#e0e0e0';
        notif.style.padding = '10px 15px';
        notif.style.marginBottom = '8px';
        notif.style.borderRadius = '4px';
        notif.style.borderLeft = `4px solid ${type === 'error' ? '#ff4444' : type === 'success' ? '#44ff44' : type === 'loot' ? '#ffd700' : '#4444ff'}`;
        notif.style.boxShadow = '0 2px 5px rgba(0,0,0,0.5)';
        notif.style.opacity = '0';
        notif.style.transform = 'translateY(-10px)';
        notif.style.transition = 'all 0.3s ease';

        this.notificationArea.appendChild(notif);

        requestAnimationFrame(() => {
            notif.style.opacity = '1';
            notif.style.transform = 'translateY(0)';
        });

        setTimeout(() => {
            notif.style.opacity = '0';
            notif.style.transform = 'translateY(-10px)';
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    }

    showPopup(text, x, y, color) {
        if (this.game.render) {
            this.game.render.addFloatingText(text, x, y, color);
        }
    }

    updateInventory(items) {}
    updateQuests(quests) {}
}
