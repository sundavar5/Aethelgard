export class Physics {
    constructor(game) {
        this.game = game;
    }

    update(dt) {
        const entities = this.game.entities;
        const player = this.game.player;
        const projectiles = this.game.projectiles || [];

        // Projectile collisions
        projectiles.forEach((p, pIdx) => {
            if (!p.active) return;

            // Check world collision
            if (this.game.checkCollision(p.x, p.y)) {
                p.active = false;
                return;
            }

            // Check enemy collision
            entities.forEach(e => {
                if (e === p.owner) return; // Don't hit owner
                if (this.checkCircleCollision(p, e)) {
                    if (e.takeDamage) {
                        e.takeDamage(p.damage);
                        p.active = false;
                    }
                }
            });

            // Check player collision (if enemy projectile)
            if (p.owner !== player && this.checkCircleCollision(p, player)) {
                if (player.takeDamage) {
                    player.takeDamage(p.damage);
                    p.active = false;
                }
            }
        });

        // Entity-Entity collision (simple push)
        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                this.resolveCollision(entities[i], entities[j]);
            }
            if (player) this.resolveCollision(player, entities[i]);
        }
    }

    checkCircleCollision(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < (a.radius + b.radius);
    }

    resolveCollision(a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = a.radius + b.radius;

        if (dist < minDist) {
            const angle = Math.atan2(dy, dx);
            const force = (minDist - dist) / 2;
            const pushX = Math.cos(angle) * force;
            const pushY = Math.sin(angle) * force;

            // Simple push away
            // Assume equal mass for now
            // Or prioritize player movement?
            // Let's just push both slightly
            if (!a.static) { a.x -= pushX; a.y -= pushY; }
            if (!b.static) { b.x += pushX; b.y += pushY; }
        }
    }
}
