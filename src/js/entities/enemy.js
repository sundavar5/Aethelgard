import { CONFIG } from '../config.js';

const ENEMY_STATES = {
    IDLE: 'idle',
    PATROL: 'patrol',
    CHASE: 'chase',
    ATTACK: 'attack',
    FLEE: 'flee'
};

export class Enemy {
    constructor(game, x, y, level) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.level = level;
        this.radius = 12;

        // Stats
        this.hp = 100 + level * 10;
        this.maxHp = this.hp;
        this.damage = 10 + level * 2;
        this.baseSpeed = 80; // Slower than player
        this.speed = this.baseSpeed;

        // AI State
        this.state = ENEMY_STATES.IDLE;
        this.stateTimer = 0;
        this.target = null;
        this.detectRadius = 250;
        this.attackRange = 40;
        this.fleeThreshold = 0.2; // 20% HP

        this.attackCooldown = 0;
        this.color = '#ff4444';

        this.statusEffects = [];
        this.canAct = true;

        // Patrol points (random nearby)
        this.patrolPoint = { x: x, y: y };
    }

    update(dt) {
        if (this.hp <= 0) return;

        this.updateStatusEffects(dt);
        if (!this.canAct) return;

        this.updateAI(dt);
        this.updateMovement(dt);

        if (this.attackCooldown > 0) this.attackCooldown -= dt;
    }

    updateAI(dt) {
        const player = this.game.player;
        if (!player) return;

        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        const hpPercent = this.hp / this.maxHp;

        // State Transitions
        switch (this.state) {
            case ENEMY_STATES.IDLE:
            case ENEMY_STATES.PATROL:
                if (dist < this.detectRadius) {
                    this.state = ENEMY_STATES.CHASE;
                    this.game.ui.showPopup('!', this.x, this.y - 20, '#ff0000');
                }
                break;

            case ENEMY_STATES.CHASE:
                if (hpPercent < this.fleeThreshold) {
                    this.state = ENEMY_STATES.FLEE;
                } else if (dist < this.attackRange) {
                    this.state = ENEMY_STATES.ATTACK;
                } else if (dist > this.detectRadius * 1.5) {
                    this.state = ENEMY_STATES.IDLE;
                }
                break;

            case ENEMY_STATES.ATTACK:
                if (dist > this.attackRange) {
                    this.state = ENEMY_STATES.CHASE;
                }
                break;

            case ENEMY_STATES.FLEE:
                if (dist > this.detectRadius * 2) {
                    this.state = ENEMY_STATES.IDLE;
                }
                break;
        }

        // State Actions
        this.target = player;
    }

    updateMovement(dt) {
        let targetX = this.x;
        let targetY = this.y;
        let moveSpeed = this.speed;

        switch (this.state) {
            case ENEMY_STATES.IDLE:
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) {
                    this.state = ENEMY_STATES.PATROL;
                    // Pick random point nearby
                    this.patrolPoint.x = this.x + (Math.random() - 0.5) * 100;
                    this.patrolPoint.y = this.y + (Math.random() - 0.5) * 100;
                }
                return; // Don't move in idle

            case ENEMY_STATES.PATROL:
                targetX = this.patrolPoint.x;
                targetY = this.patrolPoint.y;
                moveSpeed *= 0.5; // Patrol slower
                if (Math.hypot(targetX - this.x, targetY - this.y) < 5) {
                    this.state = ENEMY_STATES.IDLE;
                    this.stateTimer = 2 + Math.random() * 3;
                }
                break;

            case ENEMY_STATES.CHASE:
                targetX = this.target.x;
                targetY = this.target.y;
                break;

            case ENEMY_STATES.ATTACK:
                // Stop to attack
                if (this.attackCooldown <= 0) {
                    this.attack(this.target);
                }
                return;

            case ENEMY_STATES.FLEE:
                // Run away from player
                const angle = Math.atan2(this.y - this.target.y, this.x - this.target.x);
                targetX = this.x + Math.cos(angle) * 100;
                targetY = this.y + Math.sin(angle) * 100;
                moveSpeed *= 1.2; // Run fast
                break;
        }

        // Move towards target
        const angle = Math.atan2(targetY - this.y, targetX - this.x);
        const vx = Math.cos(angle) * moveSpeed;
        const vy = Math.sin(angle) * moveSpeed;

        const nextX = this.x + vx * dt;
        const nextY = this.y + vy * dt;

        if (!this.game.checkCollision(nextX, this.y)) this.x = nextX;
        if (!this.game.checkCollision(this.x, nextY)) this.y = nextY;
    }

    updateStatusEffects(dt) {
        this.speed = this.baseSpeed;
        this.canAct = true;

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

    attack(target) {
        if (target.takeDamage) {
            // Visualize attack (lunge)
            const angle = Math.atan2(target.y - this.y, target.x - this.x);
            this.x += Math.cos(angle) * 10;
            this.y += Math.sin(angle) * 10;

            this.game.combat.applyDamage(this, target, this.damage);
            this.attackCooldown = 1.5;
        }
    }

    takeDamage(amount, source, options = {}) {
        let damage = amount;
        this.hp -= damage;
        this.game.ui.showPopup(`${Math.floor(damage)}`, this.x, this.y, '#fff');

        // Alert AI
        if (this.state === ENEMY_STATES.IDLE || this.state === ENEMY_STATES.PATROL) {
            this.state = ENEMY_STATES.CHASE;
            this.target = source; // Retaliate
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
    }

    die() {
        // Chance to drop loot
        if (Math.random() < 0.3) {
            // Drop logic handled by LootSystem (not fully implemented yet, assume Inventory manages drops?)
            // Or just notify
            this.game.ui.notify('Dropped Gold', 'loot');
            this.game.player.gold += 10 + Math.floor(Math.random() * 20);
        }

        const idx = this.game.entities.indexOf(this);
        if (idx > -1) {
            this.game.entities.splice(idx, 1);
        }
        if (this.game.player) {
            this.game.player.xp += this.level * 20;
            this.game.ui.notify(`+${this.level * 20} XP`, 'success');
        }
    }

    render(ctx, camera) {
        if (this.hp <= 0) return;

        const px = this.x - camera.x;
        const py = this.y - camera.y;

        // Health bar
        if (this.hp < this.maxHp) {
            const pct = Math.max(0, this.hp / this.maxHp);
            ctx.fillStyle = '#333';
            ctx.fillRect(px - 15, py - 20, 30, 4);
            ctx.fillStyle = '#f00';
            ctx.fillRect(px - 15, py - 20, 30 * pct, 4);
        }

        // State Indicator (Debug)
        // ctx.fillStyle = '#fff';
        // ctx.font = '10px Arial';
        // ctx.fillText(this.state, px, py - 30);

        ctx.fillStyle = this.state === ENEMY_STATES.FLEE ? '#88f' : this.color;
        ctx.beginPath();
        ctx.arc(px, py, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Status indicators
        if (this.statusEffects.length > 0) {
            this.statusEffects.forEach((effect, i) => {
                const colors = { poison: '#0f0', burn: '#f00', freeze: '#00f', stun: '#ff0' };
                ctx.fillStyle = colors[effect.type] || '#fff';
                ctx.beginPath();
                ctx.arc(px + 10, py - 10 + (i * 6), 3, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }
}
