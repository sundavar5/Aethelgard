export class Enemy {
    constructor(game, x, y, level) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.level = level;
        this.radius = 12;
        this.hp = 100;
        this.maxHp = 100;
        this.damage = 10;
        this.speed = 100;
        this.state = 'idle';
        this.target = null;
        this.attackCooldown = 0;
        this.color = '#ff4444';

        // Randomize stats based on level
        this.hp += level * 10;
        this.maxHp = this.hp;
        this.damage += level * 2;
    }

    update(dt) {
        if (this.hp <= 0) return;

        // Simple AI: Chase player if close
        const player = this.game.player;
        if (!player) return;

        const dist = Math.hypot(player.x - this.x, player.y - this.y);

        if (dist < 300) {
            this.state = 'chase';
            this.target = player;
        } else {
            this.state = 'idle';
            this.target = null;
        }

        if (this.state === 'chase' && this.target) {
            const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);

            if (dist > 30) {
                this.x += Math.cos(angle) * this.speed * dt;
                this.y += Math.sin(angle) * this.speed * dt;
            }

            // Attack
            if (dist < 40 && this.attackCooldown <= 0) {
                this.attack(this.target);
            }
        }

        if (this.attackCooldown > 0) this.attackCooldown -= dt;
    }

    attack(target) {
        if (target.takeDamage) {
            target.takeDamage(this.damage);
            this.attackCooldown = 1.0; // 1 second cooldown
            // Visual feedback handled elsewhere or here
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        console.log('Enemy died');
        // Remove from game entities
        const idx = this.game.entities.indexOf(this);
        if (idx > -1) {
            this.game.entities.splice(idx, 1);
        }
        // Give XP to player
        if (this.game.player) {
            this.game.player.xp += this.level * 20;
        }
    }

    render(ctx, camera) {
        if (this.hp <= 0) return;

        const px = this.x - camera.x;
        const py = this.y - camera.y;

        // Health bar
        if (this.hp < this.maxHp) {
            const pct = this.hp / this.maxHp;
            ctx.fillStyle = '#333';
            ctx.fillRect(px - 15, py - 20, 30, 4);
            ctx.fillStyle = '#f00';
            ctx.fillRect(px - 15, py - 20, 30 * pct, 4);
        }

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(px, py, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}
