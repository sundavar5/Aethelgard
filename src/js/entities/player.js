import { CONFIG } from '../config.js';

/**
 * Player Entity - The hero controlled by the user.
 * Handles movement, combat actions, stats, leveling, and rendering.
 */
export class Player {
    constructor(game, x, y, className, charName, baseStats) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.radius = 12;
        this.charName = charName || 'Hero';
        this.className = className || 'warrior';

        // Base attributes from character creation
        this.str = baseStats?.str || 5;
        this.agi = baseStats?.agi || 5;
        this.int = baseStats?.int || 5;
        this.vit = baseStats?.vit || 5;
        this.cha = baseStats?.cha || 5;

        // Apply class bonuses
        const classData = CONFIG.CLASSES[this.className] || CONFIG.CLASSES.warrior;
        this.classBonuses = classData.bonuses;

        // Derived stats
        this.baseSpeed = 200;
        this.speed = this.baseSpeed;
        this.baseDamage = 10 + this.str * 2;
        this.damage = this.baseDamage;
        this.rangedDamage = 8 + this.agi * 1.5;
        this.magicDamage = 12 + this.int * 3;
        this.defense = this.vit;
        this.critChance = 0.05 + this.agi * 0.01;

        // HP/MP/Stamina
        this.maxHp = 80 + this.vit * 10;
        this.maxMp = 40 + this.int * 10;
        this.maxStamina = 100;

        // Apply class bonuses
        if (this.classBonuses.damage) this.damage *= this.classBonuses.damage;
        if (this.classBonuses.maxHp) this.maxHp = Math.floor(this.maxHp * this.classBonuses.maxHp);
        if (this.classBonuses.speed) this.baseSpeed *= this.classBonuses.speed;
        if (this.classBonuses.critChance) this.critChance += this.classBonuses.critChance;
        if (this.classBonuses.maxMp) this.maxMp = Math.floor(this.maxMp * this.classBonuses.maxMp);

        this.hp = this.maxHp;
        this.mp = this.maxMp;
        this.stamina = this.maxStamina;

        // Progression
        this.level = 1;
        this.xp = 0;
        this.xpToNext = 100;
        this.skillPoints = 0;
        this.gold = 0;

        // Velocity
        this.vx = 0;
        this.vy = 0;

        // Combat state
        this.attackCooldown = 0;
        this.dodgeCooldown = 0;
        this.invulnerable = 0;
        this.blocking = false;

        // Status effects
        this.statusEffects = [];
        this.canAct = true;

        // Equipment bonuses (recalculated on equip)
        this.equipBonusDamage = 0;
        this.equipBonusDefense = 0;
        this.equipBonusHp = 0;

        // Inventory shorthand
        this.inventory = [];
        this.equipped = { weapon: null, armor: null, accessory: null };

        // Facing angle (mouse direction)
        this.angle = 0;

        // Track movement input
        this._input = { up: false, down: false, left: false, right: false, sprint: false };
    }

    update(dt) {
        this.updateStatusEffects(dt);
        this.handleInput(dt);
        this.move(dt);
        this.regenerate(dt);

        if (this.attackCooldown > 0) this.attackCooldown -= dt;
        if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;
        if (this.invulnerable > 0) this.invulnerable -= dt;

        // Update facing angle from mouse
        this.updateAngle();

        // Check level up
        this.checkLevelUp();
    }

    updateStatusEffects(dt) {
        this.speed = this.baseSpeed;
        this.canAct = true;
        this.defense = this.vit + this.equipBonusDefense;

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

    handleInput(dt) {
        if (!this.canAct) return;

        const input = this.game.input;
        this._input.up = input.isDown('KeyW') || input.isDown('ArrowUp');
        this._input.down = input.isDown('KeyS') || input.isDown('ArrowDown');
        this._input.left = input.isDown('KeyA') || input.isDown('ArrowLeft');
        this._input.right = input.isDown('KeyD') || input.isDown('ArrowRight');
        this._input.sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');

        // Blocking
        this.blocking = input.mouse.rightDown && this.game.selectedSlot === 3;
    }

    move(dt) {
        if (!this.canAct) {
            this.vx = 0;
            this.vy = 0;
            return;
        }

        let dx = 0, dy = 0;
        if (this._input.up) dy -= 1;
        if (this._input.down) dy += 1;
        if (this._input.left) dx -= 1;
        if (this._input.right) dx += 1;

        if (dx !== 0 || dy !== 0) {
            const len = Math.hypot(dx, dy);
            dx /= len;
            dy /= len;

            let currentSpeed = this.speed;
            if (this._input.sprint && this.stamina > 0) {
                currentSpeed *= 1.5;
                this.stamina = Math.max(0, this.stamina - 25 * dt);
            }

            this.vx = dx * currentSpeed;
            this.vy = dy * currentSpeed;
        } else {
            this.vx *= 0.8;
            this.vy *= 0.8;
            if (Math.abs(this.vx) < 1) this.vx = 0;
            if (Math.abs(this.vy) < 1) this.vy = 0;
        }

        // Apply movement with collision
        const newX = this.x + this.vx * dt;
        const newY = this.y + this.vy * dt;

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

        // Clamp to world bounds
        const max = CONFIG.WORLD_SIZE * CONFIG.TILE_SIZE;
        this.x = Math.max(this.radius, Math.min(max - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(max - this.radius, this.y));
    }

    updateAngle() {
        const camera = this.game.render?.camera;
        if (!camera) return;
        const mouse = this.game.input.mouse;
        const px = this.x - camera.x;
        const py = this.y - camera.y;
        this.angle = Math.atan2(mouse.y - py, mouse.x - px);
    }

    regenerate(dt) {
        if (!this._input.sprint && this.stamina < this.maxStamina) {
            this.stamina = Math.min(this.maxStamina, this.stamina + 15 * dt);
        }
        if (this.mp < this.maxMp) {
            const mpRegen = 3 * (this.classBonuses.mpRegen || 1);
            this.mp = Math.min(this.maxMp, this.mp + mpRegen * dt);
        }
        if (this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + 0.5 * dt);
        }
    }

    /**
     * Perform an attack based on the active hotbar slot.
     */
    attack() {
        if (this.attackCooldown > 0 || this.stamina < 10 || !this.canAct) return;

        this.attackCooldown = 0.4;
        this.stamina -= 10;

        switch (this.game.selectedSlot) {
            case 0: this.meleeAttack(); break;
            case 1: this.rangedAttack(); break;
            case 2: this.castSpell(); break;
            case 3: this.block(); break;
            case 4: this.useQuickItem(); break;
        }
    }

    meleeAttack() {
        const range = 70;
        const arc = Math.PI / 3;
        const baseDmg = this.damage + this.equipBonusDamage;
        const dmg = baseDmg * (0.9 + Math.random() * 0.2);

        // Spawn slash particles
        this.game.spawnParticles(
            this.x + Math.cos(this.angle) * 35,
            this.y + Math.sin(this.angle) * 35,
            '#ff4444', 5, 80, 0.3
        );

        // Check all enemies in arc
        this.game.entities.forEach(entity => {
            if (!entity.takeDamage || entity.constructor.name === 'NPC' || entity.constructor.name === 'Interactable') return;
            const dist = Math.hypot(entity.x - this.x, entity.y - this.y);
            if (dist > range) return;

            const angleToEnemy = Math.atan2(entity.y - this.y, entity.x - this.x);
            let angleDiff = Math.abs(angleToEnemy - this.angle);
            if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

            if (angleDiff < arc) {
                const isCrit = Math.random() < this.critChance;
                const finalDmg = isCrit ? dmg * 2 : dmg;
                this.game.combat.applyDamage(this, entity, finalDmg, {
                    critChance: 0, // Already calculated
                    knockback: 15
                });
                if (isCrit) {
                    this.game.ui.showPopup('CRIT!', entity.x, entity.y - 20, '#ffff00');
                }
                // Knockback
                const kb = 15;
                const kbAngle = Math.atan2(entity.y - this.y, entity.x - this.x);
                entity.x += Math.cos(kbAngle) * kb;
                entity.y += Math.sin(kbAngle) * kb;
            }
        });
    }

    rangedAttack() {
        if (this.stamina < 15) return;
        this.stamina -= 5; // Additional stamina cost
        this.game.combat.createProjectile(
            this.x + Math.cos(this.angle) * 20,
            this.y + Math.sin(this.angle) * 20,
            this.angle, 'arrow', this
        );
    }

    castSpell() {
        if (this.mp < 20) {
            this.game.ui.notify('Not enough MP!', 'warning');
            return;
        }
        this.mp -= 20;
        this.game.combat.createProjectile(
            this.x + Math.cos(this.angle) * 20,
            this.y + Math.sin(this.angle) * 20,
            this.angle, 'fireball', this
        );
        this.game.spawnParticles(this.x, this.y, '#ff6b35', 4, 60, 0.3);
    }

    block() {
        this.blocking = true;
        // Blocking is handled in takeDamage
    }

    useQuickItem() {
        // Use the first potion in inventory
        const potion = this.game.inventory.items.find(i => i.type === 'potion');
        if (potion) {
            this.game.inventory.use(potion);
        } else {
            this.game.ui.notify('No items to use!', 'warning');
        }
    }

    /**
     * Dodge roll - brief invulnerability.
     */
    dodge() {
        if (this.dodgeCooldown > 0 || this.stamina < 20 || !this.canAct) return;

        this.dodgeCooldown = 0.8;
        this.stamina -= 20;
        this.invulnerable = 0.3;

        // Dash in movement direction or facing direction
        let dx = 0, dy = 0;
        if (this._input.up) dy -= 1;
        if (this._input.down) dy += 1;
        if (this._input.left) dx -= 1;
        if (this._input.right) dx += 1;

        if (dx === 0 && dy === 0) {
            dx = Math.cos(this.angle);
            dy = Math.sin(this.angle);
        } else {
            const len = Math.hypot(dx, dy);
            dx /= len;
            dy /= len;
        }

        const dashDist = 80;
        const newX = this.x + dx * dashDist;
        const newY = this.y + dy * dashDist;

        if (!this.game.checkCollision(newX, this.y)) this.x = newX;
        if (!this.game.checkCollision(this.x, newY)) this.y = newY;

        this.game.spawnParticles(this.x, this.y, '#ffffff', 6, 60, 0.3);
    }

    takeDamage(amount, source, options = {}) {
        if (this.invulnerable > 0) return;

        let damage = amount;

        // Block damage reduction
        if (this.blocking) {
            damage *= 0.3;
            this.stamina -= 15;
            this.game.ui.showPopup('BLOCKED', this.x, this.y - 20, '#4488ff');
            this.game.spawnParticles(this.x, this.y, '#4488ff', 3, 40, 0.2);
        }

        // Defense reduction
        damage = Math.max(1, damage - this.defense);

        this.hp -= damage;
        this.game.ui.showPopup(`-${Math.floor(damage)}`, this.x, this.y, '#ff4444');
        this.invulnerable = 0.3;

        this.game.spawnParticles(this.x, this.y, '#ff4444', 3, 50, 0.3);

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

    /**
     * Grant XP and check for level up.
     */
    addXP(amount) {
        this.xp += amount;
        this.game.ui.notify(`+${amount} XP`, 'success');
        this.checkLevelUp();
    }

    checkLevelUp() {
        while (this.xp >= this.xpToNext) {
            this.xp -= this.xpToNext;
            this.level++;
            this.xpToNext = Math.floor(this.xpToNext * 1.2);
            this.skillPoints += 2;

            // Stat increase
            this.maxHp += 10;
            this.maxMp += 5;
            this.hp = this.maxHp;
            this.mp = this.maxMp;
            this.stamina = this.maxStamina;
            this.baseDamage += 2;
            this.damage = this.baseDamage + this.equipBonusDamage;

            this.game.ui.notify(`Level Up! Now level ${this.level}`, 'success');
            this.game.spawnParticles(this.x, this.y, '#ffd700', 15, 120, 0.8);
        }
    }

    /**
     * Recalculate derived stats from equipment.
     */
    updateStats() {
        this.equipBonusDamage = 0;
        this.equipBonusDefense = 0;
        this.equipBonusHp = 0;

        const weapon = this.game.inventory.equipped.weapon;
        const armor = this.game.inventory.equipped.armor;
        const accessory = this.game.inventory.equipped.accessory;

        if (weapon?.stats) {
            this.equipBonusDamage += weapon.stats.damage || 0;
        }
        if (armor?.stats) {
            this.equipBonusDefense += armor.stats.defense || 0;
            this.equipBonusHp += armor.stats.hp || 0;
        }
        if (accessory?.stats) {
            this.equipBonusDamage += accessory.stats.damage || 0;
            this.equipBonusDefense += accessory.stats.defense || 0;
            this.critChance += (accessory.stats.crit || 0) * 0.01;
        }

        this.damage = this.baseDamage + this.equipBonusDamage;
        if (this.classBonuses.damage) this.damage *= this.classBonuses.damage;

        this.maxHp = 80 + this.vit * 10 + this.equipBonusHp;
        if (this.classBonuses.maxHp) this.maxHp = Math.floor(this.maxHp * this.classBonuses.maxHp);
        if (this.hp > this.maxHp) this.hp = this.maxHp;
    }

    /**
     * Rest to restore HP/MP/Stamina.
     */
    rest() {
        if (this.game.state !== 'playing') return;

        // Check if enemies are nearby
        const nearbyEnemy = this.game.entities.find(e =>
            e.constructor.name === 'Enemy' &&
            Math.hypot(e.x - this.x, e.y - this.y) < 200
        );

        if (nearbyEnemy) {
            this.game.ui.notify('Cannot rest with enemies nearby!', 'warning');
            return;
        }

        this.hp = this.maxHp;
        this.mp = this.maxMp;
        this.stamina = this.maxStamina;
        this.statusEffects = [];
        this.game.ui.notify('Rested - fully restored!', 'success');
        this.game.spawnParticles(this.x, this.y, '#44ff44', 8, 60, 0.5);
    }

    die() {
        this.game.state = 'dead';
        this.game.ui.showDeathScreen();

        // Lose 10% XP
        const xpLoss = Math.floor(this.xp * 0.1);
        this.xp = Math.max(0, this.xp - xpLoss);
    }

    respawn() {
        this.hp = this.maxHp;
        this.mp = this.maxMp;
        this.stamina = this.maxStamina;
        this.statusEffects = [];
        this.invulnerable = 2;

        // Respawn at world center
        this.x = CONFIG.WORLD_SIZE * CONFIG.TILE_SIZE / 2;
        this.y = CONFIG.WORLD_SIZE * CONFIG.TILE_SIZE / 2;

        this.game.state = 'playing';
        this.game.ui.hideDeathScreen();
    }

    /**
     * Select a hotbar slot.
     */
    selectSlot(index) {
        this.game.selectedSlot = Math.max(0, Math.min(4, index));
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
        ctx.fillStyle = this.invulnerable > 0 ? '#ffffff' : CONFIG.COLORS.player;
        ctx.beginPath();
        ctx.arc(px, py, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Direction indicator line
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(this.angle) * 25, py + Math.sin(this.angle) * 25);
        ctx.stroke();

        // Blocking indicator
        if (this.blocking) {
            ctx.strokeStyle = '#4488ff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(px, py, this.radius + 6, this.angle - 0.8, this.angle + 0.8);
            ctx.stroke();
        }

        // Status effect indicators
        if (this.statusEffects.length > 0) {
            this.statusEffects.forEach((effect, i) => {
                const colors = { poison: '#0f0', burn: '#f00', freeze: '#00f', stun: '#ff0' };
                ctx.fillStyle = colors[effect.type] || '#fff';
                ctx.beginPath();
                ctx.arc(px + 10 + (i * 8), py - 18, 3, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // Name label
        ctx.fillStyle = '#d4a853';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.charName, px, py - 20);
    }
}
