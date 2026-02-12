export class SkillTree {
    constructor(game) {
        this.game = game;
        this.skills = {
            combat: {
                slash: { id: 'slash', name: 'Power Slash', desc: '+20% melee damage', icon: '⚔️', cost: 1, requires: null },
                cleave: { id: 'cleave', name: 'Cleave', desc: 'Hit multiple enemies', icon: '⚡', cost: 1, requires: 'slash' },
                berserk: { id: 'berserk', name: 'Berserk', desc: '+30% attack speed', icon: '🔥', cost: 2, requires: 'cleave' },
                execute: { id: 'execute', name: 'Execute', desc: 'Finishing move', icon: '💀', cost: 2, requires: 'berserk' },
                warlord: { id: 'warlord', name: 'Warlord', desc: 'Ultimate combat mastery', icon: '👑', cost: 3, requires: 'execute' }
            },
            ranged: {
                aim: { id: 'aim', name: 'Steady Aim', desc: '+15% arrow damage', icon: '🎯', cost: 1, requires: null },
                multishot: { id: 'multishot', name: 'Multishot', desc: 'Fire multiple arrows', icon: '➶', cost: 1, requires: 'aim' },
                pierce: { id: 'pierce', name: 'Piercing', desc: 'Arrows pierce targets', icon: '➵', cost: 2, requires: 'multishot' },
                sniper: { id: 'sniper', name: 'Sniper', desc: '+50% range', icon: '🔭', cost: 2, requires: 'pierce' },
                hunter: { id: 'hunter', name: 'Master Hunter', desc: 'Ultimate archery', icon: '🏹', cost: 3, requires: 'sniper' }
            },
            // Add other branches as needed
        };
        this.unlocked = new Set();
    }

    unlock(skillId) {
        const player = this.game.player;
        if (!player) return false;

        // Find skill
        let skill = null;
        for (const branch in this.skills) {
            if (this.skills[branch][skillId]) {
                skill = this.skills[branch][skillId];
                break;
            }
        }

        if (!skill) return false;

        // Check requirements
        if (skill.requires && !this.unlocked.has(skill.requires)) {
            this.game.ui.notify('Prerequisites not met!', 'error');
            return false;
        }

        // Check cost
        if (player.skillPoints < skill.cost) {
            this.game.ui.notify('Not enough Skill Points!', 'error');
            return false;
        }

        // Unlock
        player.skillPoints -= skill.cost;
        this.unlocked.add(skillId);
        this.applyEffect(skill);
        this.game.ui.notify(`Learned ${skill.name}!`, 'success');

        return true;
    }

    applyEffect(skill) {
        const player = this.game.player;
        switch(skill.id) {
            case 'slash': player.damage *= 1.2; break;
            case 'aim': player.rangedDamage = (player.rangedDamage || player.damage) * 1.15; break;
            case 'tough': player.maxHp *= 1.1; player.hp = player.maxHp; break;
            // Implement other effects
        }
    }

    getSkill(id) {
        for (const branch in this.skills) {
            if (this.skills[branch][id]) return this.skills[branch][id];
        }
        return null;
    }
}
