export class Player {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.radius = 12;
        this.baseSpeed = 200;
        this.speed = this.baseSpeed;
        this.vx = 0;
        this.vy = 0;

        // Stats
        this.maxHp = 100;
        this.hp = this.maxHp;
        this.maxStamina = 100;
        this.stamina = this.maxStamina;
        this.maxMp = 100;
        this.mp = this.maxMp;
        this.damage = 10;
        this.defense = 0;
        this.level = 1;
        this.xp = 0;
        this.skillPoints = 0;
        this.gold = 0;
        this.critChance = 0.05;

        this.statusEffects = [];
        this.canAct = true;
        this.invulnerable = 0;

        // Input state
        this.input = {
            up: false,
            down: false,
            left: false,
            right: false,
            sprint: false
        };
    }

    update(dt) {
        this.updateStatusEffects(dt);
        this.handleInput();
        this.move(dt);
        this.regenerate(dt);

        if (this.invulnerable > 0) this.invulnerable -= dt;
    }

    updateStatusEffects(dt) {
        // Reset temporary stats
        this.speed = this.baseSpeed;
        this.canAct = true;
        this.defense = 0;

        // Iterate backwards to allow removal
        for (let i = this.statusEffects.length - 1; i >= 0; i--) {
            const effect = this.statusEffects[i];
            const active = effect.update(dt, this);

            if (!active) {
                this.statusEffects.splice(i, 1);
            } else {
                effect.applyStats(this);
            }
        }
    }

    handleInput() {
        if (!this.canAct) return;

        const input = this.game.input;
        this.input.up = input.isDown('KeyW') || input.isDown('ArrowUp');
        this.input.down = input.isDown('KeyS') || input.isDown('ArrowDown');
        this.input.left = input.isDown('KeyA') || input.isDown('ArrowLeft');
        this.input.right = input.isDown('KeyD') || input.isDown('ArrowRight');
        this.input.sprint = input.isDown('ShiftLeft');
    }

    move(dt) {
        if (!this.canAct) {
            this.vx = 0;
            this.vy = 0;
            return;
        }

        let dx = 0;
        let dy = 0;

        if (this.input.up) dy -= 1;
        if (this.input.down) dy += 1;
        if (this.input.left) dx -= 1;
        if (this.input.right) dx += 1;

        if (dx !== 0 || dy !== 0) {
            const len = Math.hypot(dx, dy);
            dx /= len;
            dy /= len;

            let currentSpeed = this.speed;
            if (this.input.sprint && this.stamina > 0) {
                currentSpeed *= 1.5;
                this.stamina = Math.max(0, this.stamina - 25 * dt);
            }

            this.vx = dx * currentSpeed;
            this.vy = dy * currentSpeed;
        } else {
            this.vx *= 0.8; // Friction
            this.vy *= 0.8;
        }

        // Apply movement
        const newX = this.x + this.vx * dt;
        const newY = this.y + this.vy * dt;

        // Improved collision (sliding along walls)
        if (!this.game.checkCollision(newX, this.y)) {
            this.x = newX;
        } else {
            this.vx = 0;
        }

        if (!this.game.checkCollision(this.x, newY)) {
            this.y = newY;
        } else {
            this.vy = 0;
        }
    }

    regenerate(dt) {
        if (!this.input.sprint) {
            this.stamina = Math.min(this.maxStamina, this.stamina + 10 * dt);
        }
        if (this.mp < this.maxMp) {
            this.mp = Math.min(this.maxMp, this.mp + 5 * dt);
        }
    }

    takeDamage(amount, source, options = {}) {
        if (this.invulnerable > 0) return;

        let damage = amount;

        // Apply defense reduction
        damage = Math.max(1, damage - this.defense);

        this.hp -= damage;
        this.game.ui.showPopup(`-${Math.floor(damage)}`, this.x, this.y, '#ff4444');
        this.invulnerable = 0.5; // Brief invulnerability

        if (options.type) {
             // Handle type specific logic if needed (e.g. fire resistance)
        }

        if (this.hp <= 0) {
            this.die();
        }
    }

    heal(amount) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
        this.game.ui.showPopup(`+${Math.floor(amount)}`, this.x, this.y, '#44ff44');
    }

    addStatusEffect(effect) {
        this.statusEffects.push(effect);
        this.game.ui.notify(`Afflicted by ${effect.type}!`, 'warning');
    }

    die() {
        this.game.ui.notify('You died!', 'error');
        // Respawn logic placeholder
        this.hp = this.maxHp;
        this.x = CONFIG.WORLD_SIZE * CONFIG.TILE_SIZE / 2;
        this.y = CONFIG.WORLD_SIZE * CONFIG.TILE_SIZE / 2;
        this.statusEffects = [];
    }

    render(ctx, camera) {
        const px = this.x - camera.x;
        const py = this.y - camera.y;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(px, py + 10, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = this.invulnerable > 0 ? '#fff' : '#d4a853';
        ctx.beginPath();
        ctx.arc(px, py, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Status Indicators (simple colored dots)
        if (this.statusEffects.length > 0) {
            this.statusEffects.forEach((effect, i) => {
                const colors = { poison: '#0f0', burn: '#f00', freeze: '#00f', stun: '#ff0' };
                ctx.fillStyle = colors[effect.type] || '#fff';
                ctx.beginPath();
                ctx.arc(px + 10, py - 10 + (i * 6), 3, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // Direction indicator
        const input = this.game.input;
        const angle = Math.atan2(input.mouse.y + camera.y - this.y, input.mouse.x + camera.x - this.x);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(angle) * 20, py + Math.sin(angle) * 20);
        ctx.stroke();
    }

    selectSlot(slotIndex) {
        console.log(`Selected slot ${slotIndex + 1}`);
        // Logic to switch active weapon/skill
    }
}
