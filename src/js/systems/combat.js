import { Projectile } from '../entities/projectile.js';

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
            if (this.game.ui) this.game.ui.showPopup('CRIT!', defender.x, defender.y, '#ffff00');
        }

        // Defense reduction
        if (defender.defense) {
            damage = Math.max(1, damage - defender.defense * 0.5);
        }

        defender.takeDamage(damage);

        // Visual effect
        if (this.game.ui) this.game.ui.showPopup(`${Math.floor(damage)}`, defender.x, defender.y, '#ff4444');
    }

    createProjectile(x, y, angle, type, owner) {
        const projectile = new Projectile(this.game, x, y, angle, type, owner);
        this.game.projectiles.push(projectile);
    }
}
