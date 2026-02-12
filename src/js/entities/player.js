export class Player {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.radius = 12;
        this.speed = 200;
        this.vx = 0;
        this.vy = 0;
        this.hp = 100;
        this.maxHp = 100;
        this.stamina = 100;
        this.maxStamina = 100;
        this.level = 1;
        this.xp = 0;
        this.skillPoints = 0;
        this.gold = 0;

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
        this.handleInput();
        this.move(dt);
        this.regenerate(dt);
    }

    handleInput() {
        const input = this.game.input;
        this.input.up = input.isDown('KeyW') || input.isDown('ArrowUp');
        this.input.down = input.isDown('KeyS') || input.isDown('ArrowDown');
        this.input.left = input.isDown('KeyA') || input.isDown('ArrowLeft');
        this.input.right = input.isDown('KeyD') || input.isDown('ArrowRight');
        this.input.sprint = input.isDown('ShiftLeft');
    }

    move(dt) {
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

        // Basic collision with world bounds (assuming 100x40 = 4000)
        // TODO: Proper collision with world tiles
        if (!this.game.world.checkCollision(newX, this.y)) this.x = newX;
        if (!this.game.world.checkCollision(this.x, newY)) this.y = newY;
    }

    regenerate(dt) {
        if (!this.input.sprint) {
            this.stamina = Math.min(this.maxStamina, this.stamina + 10 * dt);
        }
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
        ctx.fillStyle = '#d4a853'; // Player color
        ctx.beginPath();
        ctx.arc(px, py, this.radius, 0, Math.PI * 2);
        ctx.fill();

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
}
