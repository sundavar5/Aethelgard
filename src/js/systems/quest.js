export class QuestSystem {
    constructor(game) {
        this.game = game;
        this.activeQuests = [];
        this.completedQuests = [];
    }

    add(questData) {
        if (!questData) return;

        const quest = {
            id: Date.now(),
            title: questData.title,
            description: questData.description,
            type: questData.type, // 'kill', 'fetch', 'explore'
            objectives: questData.objectives || [],
            rewards: questData.rewards || { xp: 0, gold: 0 },
            progress: 0,
            target: questData.target, // e.g. 'Wolf' or 'ItemName'
            targetAmount: questData.targetAmount || 1,
            completed: false
        };

        this.activeQuests.push(quest);
        this.game.ui.updateQuests(this.activeQuests);
    }

    checkProgress(type, target, amount = 1) {
        this.activeQuests.forEach(quest => {
            if (quest.completed) return;

            if (quest.type === type && quest.target === target) {
                quest.progress += amount;

                if (quest.progress >= quest.targetAmount) {
                    this.complete(quest);
                } else {
                    this.game.ui.notify(`Quest Update: ${quest.title} (${quest.progress}/${quest.targetAmount})`, 'info');
                }
            }
        });

        // Update UI only if changed?
        // Let UI handle updates via polling or events.
        this.game.ui.updateQuests(this.activeQuests);
    }

    complete(quest) {
        quest.completed = true;
        this.activeQuests = this.activeQuests.filter(q => q !== quest);
        this.completedQuests.push(quest);

        // Give rewards
        if (this.game.player) {
            this.game.player.xp += quest.rewards.xp || 0;
            this.game.player.gold += quest.rewards.gold || 0;
            // Handle item rewards if any
        }

        this.game.ui.notify(`Quest Completed: ${quest.title}!`, 'success');
        this.game.ui.updateQuests(this.activeQuests);
    }
}
