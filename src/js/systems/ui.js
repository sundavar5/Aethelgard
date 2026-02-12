export class UI {
    constructor(game) {
        this.game = game;
        this.game.ui = this; // Attach self to game

        // References
        this.hud = document.getElementById('hud');
        this.hpBar = document.getElementById('hp-bar');
        this.mpBar = document.getElementById('mp-bar');
        this.stBar = document.getElementById('st-bar');
        this.hotbar = document.getElementById('hotbar');
        this.notificationArea = document.getElementById('notification-area');

        this.initEventListeners();
        this.createHotbar();
    }

    initEventListeners() {
        document.getElementById('btn-new-game').onclick = () => {
            document.getElementById('title-screen').classList.add('hidden');
            document.getElementById('hud').classList.remove('hidden');
            this.game.init();
        };

        document.getElementById('btn-load-game').onclick = () => {
            // Load game logic
            this.game.saveSystem.load();
        };

        // Other buttons
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
        if (this.hpBar) this.hpBar.style.width = `${(p.hp / p.maxHp) * 100}%`;
        if (this.mpBar) this.mpBar.style.width = `${(p.mp / (p.maxMp || 100)) * 100}%`;
        if (this.stBar) this.stBar.style.width = `${(p.stamina / p.maxStamina) * 100}%`;

        // Update hotbar selection
        // Need to add selectSlot to player or handle it here
    }

    notify(message, type = 'info') {
        if (!this.notificationArea) return;

        const notif = document.createElement('div');
        notif.className = `notification ${type}`;
        notif.textContent = message;
        // Simple style for now
        notif.style.background = 'rgba(0,0,0,0.8)';
        notif.style.color = '#fff';
        notif.style.padding = '10px';
        notif.style.marginBottom = '5px';
        notif.style.borderRadius = '5px';
        notif.style.borderLeft = `4px solid ${type === 'error' ? 'red' : type === 'success' ? 'green' : 'blue'}`;

        this.notificationArea.appendChild(notif);

        setTimeout(() => {
            notif.remove();
        }, 3000);
    }

    showPopup(text, x, y, color) {
        // Floating text
        // Could be canvas based or DOM based.
        // Let's do DOM for simplicity if UI layer is above canvas
        const popup = document.createElement('div');
        popup.textContent = text;
        popup.style.position = 'absolute';

        // Convert world to screen coords?
        // Wait, x/y are world coords.
        // Need to project to screen.
        // Since we don't have easy access to camera in UI update loop without reference,
        // we might want to handle floating text in Render system instead.
        // But for now, let's just log it or notify.
        // this.notify(text, 'combat');

        // Actually, let's add a floating text system to Render.
        if (this.game.render) {
            this.game.render.addFloatingText(text, x, y, color);
        }
    }

    updateInventory(items) {
        // Update inventory UI
    }

    updateQuests(quests) {
        // Update quest UI
    }
}
