import { CONFIG } from '../config.js';

const ENEMY_STATES = {
    IDLE: 'idle',
    PATROL: 'patrol',
    CHASE: 'chase',
    ATTACK: 'attack',
    FLEE: 'flee'
};

/**
 * Enemy Entity - AI-driven hostile creatures with multiple behavior states.
 */
export class Enemy {
    constructor(game, x, y, level, typeKey) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.level = level || 1;
        this.radius = 12;

        // Type data from config
        const typeData = CONFIG.ENEMY_TYPES[typeKey] || CONFIG.ENEMY_TYPES.bandit;
        this.typeKey = typeKey || 'bandit';
        this.name = typeData.name;
        this.icon = typeData.icon;
        this.color = typeData.color;

        // Stats scaled by level
        const diff = CONFIG.DIFFICULTY[game.settings?.difficulty] || 1.0;
        this.maxHp = Math.floor((typeData.hp + level * 10) * diff);
        this.hp = this.maxHp;
        this.damage = Math.floor((typeData.dmg + level * 2) * diff);
        this.baseSpeed = typeData.speed;
        this.speed = this.baseSpeed;
        this.xpReward = typeData.xp + level * 5;

        // AI State
        this.state = ENEMY_STATES.IDLE;
        this.stateTimer = 2 + Math.random() * 3;
        this.target = null;
        this.detectRadius = 250;
        this.attackRange = 40;
        this.fleeThreshold = 0.2;

        this.attackCooldown = 0;
        this.statusEffects = [];
        this.canAct = true;

        // Patrol
        this.patrolPoint = { x, y };
        this.originX = x;
        this.originY = y;
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

        switch (this.state) {
            case ENEMY_STATES.IDLE:
                this.stateTimer -= dt;
                if (dist < this.detectRadius) {
                    this.state = ENEMY_STATES.CHASE;
                    this.game.ui.showPopup('!', this.x, this.y - 20, '#ff0000');
                } else if (this.stateTimer <= 0) {
                    this.state = ENEMY_STATES.PATROL;
                    this.patrolPoint.x = this.originX + (Math.random() - 0.5) * 150;
                    this.patrolPoint.y = this.originY + (Math.random() - 0.5) * 150;
                }
                break;

            case ENEMY_STATES.PATROL:
                if (dist < this.detectRadius) {
                    this.state = ENEMY_STATES.CHASE;
                    this.game.ui.showPopup('!', this.x, this.y - 20, '#ff0000');
                } else if (Math.hypot(this.patrolPoint.x - this.x, this.patrolPoint.y - this.y) < 10) {
                    this.state = ENEMY_STATES.IDLE;
                    this.stateTimer = 2 + Math.random() * 3;
                }
                break;

            case ENEMY_STATES.CHASE:
                if (hpPercent < this.fleeThreshold) {
                    this.state = ENEMY_STATES.FLEE;
                } else if (dist < this.attackRange) {
                    this.state = ENEMY_STATES.ATTACK;
                } else if (dist > this.detectRadius * 2) {
                    this.state = ENEMY_STATES.IDLE;
                    this.stateTimer = 1;
                }
                break;

            case ENEMY_STATES.ATTACK:
                if (dist > this.attackRange * 1.5) {
                    this.state = ENEMY_STATES.CHASE;
                } else if (hpPercent < this.fleeThreshold) {
                    this.state = ENEMY_STATES.FLEE;
                }
                break;

            case ENEMY_STATES.FLEE:
                if (dist > this.detectRadius * 2.5) {
                    this.state = ENEMY_STATES.IDLE;
                    this.stateTimer = 3;
                }
                break;
        }

        this.target = player;
    }

    updateMovement(dt) {
        let targetX = this.x;
        let targetY = this.y;
        let moveSpeed = this.speed;

        switch (this.state) {
            case ENEMY_STATES.IDLE:
                return;

            case ENEMY_STATES.PATROL:
                targetX = this.patrolPoint.x;
                targetY = this.patrolPoint.y;
                moveSpeed *= 0.5;
                break;

            case ENEMY_STATES.CHASE:
                targetX = this.target.x;
                targetY = this.target.y;
                break;

            case ENEMY_STATES.ATTACK:
                if (this.attackCooldown <= 0) {
                    this.attack(this.target);
                }
                return;

            case ENEMY_STATES.FLEE:
                const fleeAngle = Math.atan2(this.y - this.target.y, this.x - this.target.x);
                targetX = this.x + Math.cos(fleeAngle) * 100;
                targetY = this.y + Math.sin(fleeAngle) * 100;
                moveSpeed *= 1.3;
                break;
        }

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
        if (!target?.takeDamage) return;

        // Lunge animation
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        this.x += Math.cos(angle) * 8;
        this.y += Math.sin(angle) * 8;

        this.game.combat.applyDamage(this, target, this.damage);
        this.attackCooldown = 1.2 + Math.random() * 0.5;

        this.game.spawnParticles(target.x, target.y, this.color, 3, 40, 0.2);
    }

    takeDamage(amount, source, options = {}) {
        let damage = amount;
        this.hp -= damage;
        this.game.ui.showPopup(`-${Math.floor(damage)}`, this.x, this.y, '#ffffff');

        // Aggro
        if (this.state === ENEMY_STATES.IDLE || this.state === ENEMY_STATES.PATROL) {
            this.state = ENEMY_STATES.CHASE;
            this.target = source;
        }

        this.game.spawnParticles(this.x, this.y, '#ff4444', 2, 30, 0.2);

        if (this.hp <= 0) {
            this.die(source);
        }
    }

    heal(amount) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
    }

    addStatusEffect(effect) {
        this.statusEffects.push(effect);
    }

    die(killer) {
        // Death particles
        this.game.spawnParticles(this.x, this.y, this.color, 10, 80, 0.5);

        // Drop loot
        if (Math.random() < 0.4) {
            const goldAmount = 5 + Math.floor(Math.random() * 15) * this.level;
            if (this.game.player) {
                this.game.player.gold += goldAmount;
                this.game.ui.notify(`+${goldAmount} Gold`, 'loot');
            }
        }

        // Drop potion chance
        if (Math.random() < 0.15) {
            this.game.ui.notify('Dropped Health Potion', 'loot');
            this.game.inventory.add({
                type: 'potion', name: 'Health Potion', rarity: 'common',
                value: 25, stats: { healing: 30 + this.level * 5 }
            });
        }

        // XP
        if (this.game.player) {
            this.game.player.addXP(this.xpReward);
        }

        // Quest progress
        this.game.questSystem.checkProgress('kill', this.name, 1);
        this.game.questSystem.checkProgress('kill', this.typeKey, 1);

        // Remove from entities
        const idx = this.game.entities.indexOf(this);
        if (idx > -1) this.game.entities.splice(idx, 1);
    }

    render(ctx, camera) {
        if (this.hp <= 0) return;

        const px = this.x - camera.x;
        const py = this.y - camera.y;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(px, py + 10, 10, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Health bar (when damaged)
        if (this.hp < this.maxHp) {
            const pct = Math.max(0, this.hp / this.maxHp);
            ctx.fillStyle = '#333';
            ctx.fillRect(px - 15, py - 22, 30, 4);
            ctx.fillStyle = pct > 0.5 ? '#44ff44' : pct > 0.25 ? '#ffaa00' : '#ff4444';
            ctx.fillRect(px - 15, py - 22, 30 * pct, 4);
        }

        // Body
        ctx.fillStyle = this.state === ENEMY_STATES.FLEE ? '#88aaff' : this.color;
        ctx.beginPath();
        ctx.arc(px, py, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Type icon
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.icon, px, py + 4);

        // Name and level
        ctx.fillStyle = '#ccc';
        ctx.font = '9px Arial';
        ctx.fillText(`${this.name} Lv${this.level}`, px, py - 28);

        // Status indicators
        this.statusEffects.forEach((effect, i) => {
            const colors = { poison: '#0f0', burn: '#f00', freeze: '#00f', stun: '#ff0' };
            ctx.fillStyle = colors[effect.type] || '#fff';
            ctx.beginPath();
            ctx.arc(px + 10 + (i * 6), py - 12, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}
