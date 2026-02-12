/**
 * Skill Tree System - 4 branches: Combat, Ranged, Magic, Survival.
 * Each branch has 5 skills with prerequisites and stat effects.
 */
export class SkillTree {
    constructor(game) {
        this.game = game;
        this.skills = {
            combat: {
                slash:   { id: 'slash',   name: 'Power Slash', desc: '+20% melee damage',   icon: '\u2694\ufe0f', cost: 1, requires: null },
                cleave:  { id: 'cleave',  name: 'Cleave',      desc: 'AOE melee attacks',    icon: '\u26a1',       cost: 1, requires: 'slash' },
                berserk: { id: 'berserk', name: 'Berserk',     desc: '+30% attack speed',    icon: '\ud83d\udd25', cost: 2, requires: 'cleave' },
                execute: { id: 'execute', name: 'Execute',     desc: '2x dmg below 20% HP',  icon: '\ud83d\udc80', cost: 2, requires: 'berserk' },
                warlord: { id: 'warlord', name: 'Warlord',     desc: '+50% melee mastery',   icon: '\ud83d\udc51', cost: 3, requires: 'execute' }
            },
            ranged: {
                aim:      { id: 'aim',      name: 'Steady Aim',    desc: '+15% arrow damage', icon: '\ud83c\udfaf', cost: 1, requires: null },
                multishot:{ id: 'multishot',name: 'Multishot',     desc: 'Fire 3 arrows',     icon: '\u27b6',       cost: 1, requires: 'aim' },
                pierce:   { id: 'pierce',   name: 'Piercing',      desc: 'Arrows penetrate',  icon: '\u27b5',       cost: 2, requires: 'multishot' },
                sniper:   { id: 'sniper',   name: 'Sniper',        desc: '+50% range',        icon: '\ud83d\udd2d', cost: 2, requires: 'pierce' },
                hunter:   { id: 'hunter',   name: 'Master Hunter', desc: '+75% ranged mastery',icon: '\ud83c\udff9', cost: 3, requires: 'sniper' }
            },
            magic: {
                arcane:    { id: 'arcane',    name: 'Arcane Focus',  desc: '+20% spell damage',  icon: '\ud83d\udd2e', cost: 1, requires: null },
                frost:     { id: 'frost',     name: 'Frost Bolt',    desc: 'Slow on hit',        icon: '\u2744\ufe0f', cost: 1, requires: 'arcane' },
                lightning: { id: 'lightning', name: 'Lightning',     desc: 'Chain damage',       icon: '\u26a1',       cost: 2, requires: 'frost' },
                meteor:    { id: 'meteor',    name: 'Meteor',        desc: 'Massive AOE',        icon: '\u2604\ufe0f', cost: 2, requires: 'lightning' },
                archmage:  { id: 'archmage',  name: 'Archmage',      desc: '+100% magic mastery',icon: '\ud83e\uddd9', cost: 3, requires: 'meteor' }
            },
            survival: {
                tough:     { id: 'tough',     name: 'Toughness',     desc: '+10% max HP',        icon: '\ud83d\udee1\ufe0f', cost: 1, requires: null },
                regen:     { id: 'regen',     name: 'Regeneration',  desc: 'HP over time',       icon: '\ud83d\udc9a', cost: 1, requires: 'tough' },
                evasion:   { id: 'evasion',   name: 'Evasion',       desc: '+15% dodge chance',  icon: '\ud83d\udca8', cost: 2, requires: 'regen' },
                scout:     { id: 'scout',     name: 'Scout',         desc: 'Detect enemies',     icon: '\ud83d\udc41\ufe0f', cost: 2, requires: 'evasion' },
                immortal:  { id: 'immortal',  name: 'Immortal',      desc: 'Survive fatal blow',  icon: '\u2b50',       cost: 3, requires: 'scout' }
            }
        };
        this.unlocked = new Set();
    }

    unlock(skillId) {
        const player = this.game.player;
        if (!player) return false;

        const skill = this.getSkill(skillId);
        if (!skill) return false;

        if (skill.requires && !this.unlocked.has(skill.requires)) {
            this.game.ui.notify('Prerequisites not met!', 'error');
            return false;
        }

        if (this.unlocked.has(skillId)) {
            this.game.ui.notify('Already learned!', 'info');
            return false;
        }

        if (player.skillPoints < skill.cost) {
            this.game.ui.notify('Not enough Skill Points!', 'error');
            return false;
        }

        player.skillPoints -= skill.cost;
        this.unlocked.add(skillId);
        this.applyEffect(skill);
        this.game.ui.notify(`Learned ${skill.name}!`, 'success');
        this.game.spawnParticles(player.x, player.y, '#d4a853', 8, 80, 0.5);
        return true;
    }

    applyEffect(skill) {
        const player = this.game.player;
        if (!player) return;

        switch (skill.id) {
            // Combat
            case 'slash':   player.baseDamage *= 1.2; player.damage = player.baseDamage; break;
            case 'cleave':  player._hasCleave = true; break;
            case 'berserk': player._attackSpeedMult = (player._attackSpeedMult || 1) * 0.7; break;
            case 'execute': player._hasExecute = true; break;
            case 'warlord': player.baseDamage *= 1.5; player.damage = player.baseDamage; break;

            // Ranged
            case 'aim':       player.rangedDamage *= 1.15; break;
            case 'multishot': player._hasMultishot = true; break;
            case 'pierce':    player._hasPierce = true; break;
            case 'sniper':    player._rangeMultiplier = 1.5; break;
            case 'hunter':    player.rangedDamage *= 1.75; break;

            // Magic
            case 'arcane':    player.magicDamage *= 1.2; break;
            case 'frost':     player._hasFrostBolt = true; break;
            case 'lightning': player._hasLightning = true; break;
            case 'meteor':    player._hasMeteor = true; break;
            case 'archmage':  player.magicDamage *= 2.0; break;

            // Survival
            case 'tough':    player.maxHp = Math.floor(player.maxHp * 1.1); player.hp = Math.min(player.hp, player.maxHp); break;
            case 'regen':    player._hasRegen = true; break;
            case 'evasion':  player._dodgeChance = (player._dodgeChance || 0) + 0.15; break;
            case 'scout':    player._hasScout = true; break;
            case 'immortal': player._hasImmortal = true; break;
        }
    }

    getSkill(id) {
        for (const branch in this.skills) {
            if (this.skills[branch][id]) return this.skills[branch][id];
        }
        return null;
    }

    /**
     * Serialize unlocked skills for save system.
     */
    serialize() {
        return Array.from(this.unlocked);
    }

    /**
     * Restore unlocked skills from save data.
     */
    deserialize(data) {
        if (!Array.isArray(data)) return;
        this.unlocked = new Set();
        data.forEach(id => {
            this.unlocked.add(id);
            const skill = this.getSkill(id);
            if (skill) this.applyEffect(skill);
        });
    }
}
