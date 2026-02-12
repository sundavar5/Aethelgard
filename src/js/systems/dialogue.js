/**
 * Dialogue System - Manages NPC conversations with AI-generated responses.
 */
export class Dialogue {
    constructor(game) {
        this.game = game;
        this.currentNPC = null;
        this.active = false;
    }

    async start(npc) {
        if (this.active) return;
        this.active = true;
        this.currentNPC = npc;

        const panel = document.getElementById('dialogue-panel');
        if (panel) panel.classList.remove('hidden');

        const nameEl = document.getElementById('dialogue-npc-name');
        const titleEl = document.getElementById('dialogue-npc-title');
        if (nameEl) nameEl.textContent = npc.name;
        if (titleEl) titleEl.textContent = `${npc.race} ${npc.occupation}`;

        // Show thinking indicator
        const textEl = document.getElementById('dialogue-text');
        if (textEl) textEl.textContent = 'Thinking...';
        document.getElementById('dialogue-options').innerHTML = '';

        // Initial greeting
        const response = await npc.talk('');
        if (response) {
            this.updateContent(response);
            npc.addToHistory(npc.name, response.response);
        }

        this.game.ui.addChatMessage('npc', npc.name, response?.response || npc.greeting);
    }

    async selectOption(text) {
        if (!this.currentNPC) return;

        this.currentNPC.addToHistory('Player', text);
        this.game.ui.addChatMessage('player', this.game.player?.charName || 'You', text);

        // Show thinking
        const textEl = document.getElementById('dialogue-text');
        if (textEl) textEl.textContent = 'Thinking...';
        document.getElementById('dialogue-options').innerHTML = '';

        const response = await this.currentNPC.talk(text);
        if (response) {
            this.updateContent(response);
            this.currentNPC.addToHistory(this.currentNPC.name, response.response);
            this.game.ui.addChatMessage('npc', this.currentNPC.name, response.response);
        }

        // Check for quest triggers
        if (text.toLowerCase().includes('quest') && this.currentNPC.quest) {
            const q = this.currentNPC.quest;
            if (!this.game.questSystem.activeQuests.find(aq => aq.title === q.title)) {
                this.game.questSystem.add(q);
                this.game.ui.notify(`Quest Accepted: ${q.title}`, 'success');
                this.currentNPC.quest = null; // Can only give quest once
            }
        }
    }

    updateContent(data) {
        const textEl = document.getElementById('dialogue-text');
        if (textEl) textEl.textContent = data.response || '...';

        const optionsContainer = document.getElementById('dialogue-options');
        if (!optionsContainer) return;
        optionsContainer.innerHTML = '';

        const options = data.playerOptions || ['Tell me more.', 'Do you have any quests?', 'Goodbye.'];
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'dialogue-option-btn';
            btn.textContent = opt;
            btn.onclick = () => this.selectOption(opt);
            optionsContainer.appendChild(btn);
        });

        // Always add goodbye
        const bye = document.createElement('button');
        bye.className = 'dialogue-option-btn';
        bye.textContent = '[Leave]';
        bye.onclick = () => this.close();
        optionsContainer.appendChild(bye);
    }

    close() {
        this.active = false;
        this.currentNPC = null;
        const panel = document.getElementById('dialogue-panel');
        if (panel) panel.classList.add('hidden');
    }
}
