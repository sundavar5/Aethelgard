import { Projectile } from '../entities/projectile.js';
import { StatusEffect, STATUS_TYPES } from './status_effects.js';

export class Combat {
    constructor(game) {
        this.game = game;
    }

    applyDamage(attacker, defender, amount, options = {}) {
        if (!defender || !defender.takeDamage) return;

        let damage = amount;
        let isCrit = false;

        // Critical hit
        if (options.critChance && Math.random() < options.critChance) {
            damage *= 2;
            isCrit = true;
            this.game.ui.showPopup('CRIT!', defender.x, defender.y, '#ffff00');

            // Screen Shake on crit (if player involved)
            if (this.game.player === attacker || this.game.player === defender) {
                this.game.render.triggerShake(5, 0.2);
            }
        }

        // Elemental resistances
        if (defender.resistances && options.element) {
            const res = defender.resistances[options.element] || 0;
            damage *= (1 - res);
        }

        // Apply Status Effects (chance based)
        if (options.statusChance && Math.random() < options.statusChance) {
            const type = options.statusType;
            const duration = options.statusDuration || 3.0;
            const power = options.statusPower || 5;

            if (type && defender.addStatusEffect) {
                defender.addStatusEffect(new StatusEffect(type, duration, power, attacker));
            }
        }

        defender.takeDamage(damage, attacker, options);

        // Blood particles
        const color = defender === this.game.player ? '#ff0000' : (defender.color || '#ff4444');
        for (let i = 0; i < (isCrit ? 10 : 5); i++) {
            this.game.render.addParticle(defender.x, defender.y, color, 100, 0.5);
        }
    }

    createProjectile(x, y, angle, type, owner, options = {}) {
        const projectile = new Projectile(this.game, x, y, angle, type, owner);

        if (options.element) projectile.element = options.element;
        if (options.statusType) {
            projectile.statusType = options.statusType;
            projectile.statusChance = options.statusChance || 0.2;
            projectile.statusDuration = options.statusDuration || 3.0;
            projectile.statusPower = options.statusPower || 5;
        }

        this.game.projectiles.push(projectile);
    }
}
