export class Dialogue {
    constructor(game) {
        this.game = game;
        this.panel = null;
        this.currentNPC = null;
        this.active = false;

        // Ensure UI layer exists
        this.createUI();
    }

    createUI() {
        // Only if it doesn't exist
        if (document.getElementById('dialogue-panel')) return;

        const uiLayer = document.getElementById('ui-layer');
        if (!uiLayer) return;

        const panel = document.createElement('div');
        panel.id = 'dialogue-panel';
        panel.className = 'screen dialogue-ui hidden';
        panel.innerHTML = `
            <div class="dialogue-box">
                <div class="dialogue-header">
                    <h3 id="dialogue-npc-name">NPC Name</h3>
                    <span id="dialogue-npc-title">Title</span>
                    <button class="close-btn">X</button>
                </div>
                <div class="dialogue-content" id="dialogue-text">
                    Greetings...
                </div>
                <div class="dialogue-options" id="dialogue-options">
                    <!-- Options injected here -->
                </div>
            </div>
        `;
        uiLayer.appendChild(panel);

        // Styling via JS or ensure CSS is updated
        // For simplicity, add inline styles or assume CSS handles it
        // Check style.css if needed

        this.panel = panel;
        panel.querySelector('.close-btn').onclick = () => this.close();
    }

    async start(npc) {
        if (this.active) return;
        this.active = true;
        this.currentNPC = npc;

        const panel = document.getElementById('dialogue-panel');
        panel.classList.remove('hidden');

        document.getElementById('dialogue-npc-name').textContent = npc.name;
        document.getElementById('dialogue-npc-title').textContent = `${npc.race} ${npc.occupation}`;

        // Initial greeting
        const response = await npc.talk('');
        this.updateContent(response);
        npc.addToHistory(npc.name, response.response);
    }

    async selectOption(text) {
        if (!this.currentNPC) return;

        // Add player message to history
        this.currentNPC.addToHistory('Player', text);

        // Show loading state
        document.getElementById('dialogue-text').textContent = 'Thinking...';
        document.getElementById('dialogue-options').innerHTML = '';

        // Get AI response
        const response = await this.currentNPC.talk(text);
        this.updateContent(response);
        this.currentNPC.addToHistory(this.currentNPC.name, response.response);

        // Check for quest triggers
        if (text.toLowerCase().includes('quest') && this.currentNPC.quest) {
            this.game.quests.add(this.currentNPC.quest);
            this.game.ui.notify(`Quest Accepted: ${this.currentNPC.quest.title}`, 'success');
        }
    }

    updateContent(data) {
        document.getElementById('dialogue-text').textContent = data.response;

        const optionsContainer = document.getElementById('dialogue-options');
        optionsContainer.innerHTML = '';

        data.playerOptions.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'dialogue-option-btn';
            btn.textContent = opt;
            btn.onclick = () => this.selectOption(opt);
            optionsContainer.appendChild(btn);
        });

        const bye = document.createElement('button');
        bye.className = 'dialogue-option-btn';
        bye.textContent = 'Goodbye';
        bye.onclick = () => this.close();
        optionsContainer.appendChild(bye);
    }

    close() {
        this.active = false;
        this.currentNPC = null;
        document.getElementById('dialogue-panel').classList.add('hidden');
    }
}
