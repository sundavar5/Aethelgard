export class Projectile {
    constructor(game, x, y, angle, type, owner) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.type = type;
        this.owner = owner;
        this.active = true;

        this.speed = type === 'arrow' ? 500 : 350;
        this.damage = type === 'arrow' ? (owner.damage * 0.8) : (30 + (owner.int || 0) * 2);
        this.radius = 5;
        this.life = 2.0; // Seconds

        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;

        if (this.life <= 0) this.active = false;

        // World collision
        if (this.game.checkCollision(this.x, this.y)) {
            this.active = false;
        }

        // Entity collision handled in Physics system or here?
        // Let's do it here for simplicity for now, but ideally in Physics.
    }

    render(ctx, camera) {
        if (!this.active) return;

        const px = this.x - camera.x;
        const py = this.y - camera.y;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(this.angle);

        if (this.type === 'arrow') {
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(-8, -2, 16, 4);
        } else {
            const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 12);
            grad.addColorStop(0, '#fff');
            grad.addColorStop(0.3, '#ff6b35');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
