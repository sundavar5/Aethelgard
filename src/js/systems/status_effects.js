export const STATUS_TYPES = {
    POISON: 'poison',
    BURN: 'burn',
    FREEZE: 'freeze',
    STUN: 'stun',
    REGEN: 'regen',
    BUFF_STR: 'buff_str',
    BUFF_DEF: 'buff_def'
};

export class StatusEffect {
    constructor(type, duration, power, source) {
        this.type = type;
        this.duration = duration;
        this.power = power;
        this.source = source;
        this.timer = 0;
        this.tickTimer = 0;
    }

    update(dt, target) {
        this.timer += dt;
        this.tickTimer += dt;

        // Return true if still active, false if expired
        if (this.timer >= this.duration) return false;

        // Apply periodic effects
        if (this.type === STATUS_TYPES.POISON) {
            if (this.tickTimer >= 1.0) {
                target.takeDamage(this.power, this.source, { type: 'poison' });
                this.tickTimer = 0;
            }
        } else if (this.type === STATUS_TYPES.BURN) {
            if (this.tickTimer >= 0.5) {
                target.takeDamage(this.power / 2, this.source, { type: 'fire' });
                this.tickTimer = 0;
            }
        } else if (this.type === STATUS_TYPES.REGEN) {
            if (this.tickTimer >= 1.0) {
                target.heal(this.power);
                this.tickTimer = 0;
            }
        }

        return true;
    }

    applyStats(stats) {
        if (this.type === STATUS_TYPES.FREEZE) {
            stats.speed *= (1 - this.power); // e.g. 0.5 = 50% slow
        } else if (this.type === STATUS_TYPES.BUFF_STR) {
            stats.damage *= (1 + this.power);
        } else if (this.type === STATUS_TYPES.BUFF_DEF) {
            stats.defense *= (1 + this.power);
        } else if (this.type === STATUS_TYPES.STUN) {
            stats.canAct = false;
        }
    }
}
