import { Projectile } from '../entities/projectile.js';
import { StatusEffect, STATUS_TYPES } from './status_effects.js';

export class Combat {
    constructor(game) {
        this.game = game;
    }

    applyDamage(attacker, defender, amount, options = {}) {
        if (!defender || !defender.takeDamage) return;

        let damage = amount;

        // Critical hit
        if (options.critChance && Math.random() < options.critChance) {
            damage *= 2;
            this.game.ui.showPopup('CRIT!', defender.x, defender.y, '#ffff00');
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
    }

    createProjectile(x, y, angle, type, owner, options = {}) {
        // Options can override base projectile stats
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
