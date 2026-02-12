import { CONFIG } from '../config.js';

/**
 * UI System - Manages all HTML UI elements, screens, panels, notifications.
 * Acts as the bridge between game state and DOM.
 */
export class UI {
    constructor(game) {
        this.game = game;

        // Screen refs
        this.titleScreen = document.getElementById('title-screen');
        this.charCreation = document.getElementById('char-creation');
        this.loadingScreen = document.getElementById('loading-screen');
        this.settingsScreen = document.getElementById('settings-screen');
        this.hud = document.getElementById('hud');
        this.deathScreen = document.getElementById('death-screen');

        // HUD refs
        this.hpBar = document.getElementById('hp-bar');
        this.hpText = document.getElementById('hp-text');
        this.mpBar = document.getElementById('mp-bar');
        this.mpText = document.getElementById('mp-text');
        this.stBar = document.getElementById('st-bar');
        this.stText = document.getElementById('st-text');
        this.xpBar = document.getElementById('xp-bar');
        this.xpText = document.getElementById('xp-text');
        this.hudLevel = document.getElementById('hud-level');
        this.hudSP = document.getElementById('hud-sp');
        this.hudGold = document.getElementById('hud-gold');
        this.hudWorldName = document.getElementById('hud-world-name');
        this.hudRegion = document.getElementById('hud-region');
        this.hudTime = document.getElementById('hud-time');
        this.hotbar = document.getElementById('hotbar');
        this.questTracker = document.getElementById('quest-tracker-content');

        // Panel refs
        this.sidePanel = document.getElementById('side-panel');
        this.dialoguePanel = document.getElementById('dialogue-panel');
        this.mapOverlay = document.getElementById('map-overlay');
        this.helpOverlay = document.getElementById('help-overlay');
        this.itemPopup = document.getElementById('item-popup');
        this.eventBanner = document.getElementById('event-banner');
        this.genLog = document.getElementById('gen-log');
        this.notificationArea = document.getElementById('notification-area');

        // State
        this.sidePanelOpen = false;
        this.mapOpen = false;
        this.helpOpen = false;
        this.activeTab = 'chat';

        this.initEventListeners();
    }

    initEventListeners() {
        // Title screen buttons
        document.getElementById('btn-new-game')?.addEventListener('click', () => {
            this.showScreen('creation');
        });
        document.getElementById('btn-load-game')?.addEventListener('click', () => {
            this.game.loadGame();
        });
        document.getElementById('btn-settings')?.addEventListener('click', () => {
            this.showScreen('settings');
        });

        // API key management
        document.getElementById('btn-save-key')?.addEventListener('click', () => {
            const key = document.getElementById('api-key-input').value;
            this.game.ai.setApiKey(key);
            this.updateApiStatus();
        });
        document.getElementById('btn-test-key')?.addEventListener('click', () => {
            this.testApiKey();
        });
        document.getElementById('btn-clear-key')?.addEventListener('click', () => {
            this.game.ai.setApiKey('');
            document.getElementById('api-key-input').value = '';
            this.updateApiStatus();
        });

        // Initialize API status on load
        const savedKey = localStorage.getItem('deepseek_api_key');
        if (savedKey) {
            document.getElementById('api-key-input').value = savedKey;
        }
        this.updateApiStatus();

        // Character creation
        document.querySelectorAll('.class-card').forEach(card => {
            card.addEventListener('click', () => this.selectClass(card.dataset.class));
        });

        document.querySelectorAll('.stat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const row = btn.closest('.stat-row');
                const stat = row.dataset.stat;
                const action = btn.dataset.action;
                this.adjustStat(stat, action);
            });
        });

        document.getElementById('btn-back-title')?.addEventListener('click', () => {
            this.showScreen('title');
        });

        document.getElementById('btn-start-game')?.addEventListener('click', () => {
            this.game.charName = document.getElementById('char-name').value || 'Hero';
            this.game.worldSeed = document.getElementById('world-seed').value;
            this.game.startNewGame();
        });

        // Settings
        document.getElementById('btn-settings-back')?.addEventListener('click', () => {
            this.saveSettingsFromUI();
            this.showScreen('title');
        });

        // HUD quick actions
        document.getElementById('btn-map')?.addEventListener('click', () => this.toggleMap());
        document.getElementById('btn-menu')?.addEventListener('click', () => this.toggleSidePanel());
        document.getElementById('btn-rest')?.addEventListener('click', () => this.game.player?.rest());
        document.getElementById('btn-help')?.addEventListener('click', () => this.toggleHelp());

        // Side panel tabs
        document.querySelectorAll('.side-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Close buttons
        document.getElementById('btn-close-dialogue')?.addEventListener('click', () => this.game.dialogue.close());
        document.getElementById('btn-close-map')?.addEventListener('click', () => this.toggleMap());
        document.getElementById('btn-close-help')?.addEventListener('click', () => this.toggleHelp());

        // Death screen
        document.getElementById('btn-respawn')?.addEventListener('click', () => this.game.player?.respawn());

        // Chat input
        document.getElementById('btn-chat-send')?.addEventListener('click', () => this.sendChat());
        document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.sendChat();
        });

        // Hotbar slots
        document.querySelectorAll('.hotbar-slot').forEach(slot => {
            slot.addEventListener('click', () => {
                const idx = parseInt(slot.dataset.slot);
                this.game.player?.selectSlot(idx);
                this.updateHotbar();
            });
        });

        // Keyboard shortcuts
        this.game.input.on('keydown', (e) => this.handleKeyDown(e));

        // Mouse attack
        this.game.input.on('mousedown', (e) => {
            if (this.game.state !== 'playing') return;
            if (this.sidePanelOpen || this.mapOpen || this.helpOpen) return;
            if (this.game.dialogue.active) return;

            if (e.button === 0) {
                this.game.player?.attack();
            }
        });

        // Mouse wheel for hotbar cycling
        this.game.input.on('wheel', (e) => {
            if (this.game.state !== 'playing') return;
            const dir = e.deltaY > 0 ? 1 : -1;
            const newSlot = (this.game.selectedSlot + dir + 5) % 5;
            this.game.player?.selectSlot(newSlot);
            this.updateHotbar();
        });
    }

    handleKeyDown(e) {
        if (this.game.state !== 'playing') return;

        // Prevent defaults for game keys
        const gameKeys = ['Tab', 'KeyM', 'KeyR', 'KeyH', 'Space', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'KeyE'];
        if (gameKeys.includes(e.code)) e.preventDefault();

        switch (e.code) {
            case 'Tab':
                this.toggleSidePanel();
                break;
            case 'KeyM':
                this.toggleMap();
                break;
            case 'KeyH':
                this.toggleHelp();
                break;
            case 'KeyR':
                if (!this.sidePanelOpen && !this.game.dialogue.active) {
                    this.game.player?.rest();
                }
                break;
            case 'Space':
                if (!this.sidePanelOpen && !this.game.dialogue.active) {
                    this.game.player?.dodge();
                }
                break;
            case 'KeyE':
                if (!this.sidePanelOpen) {
                    this.interactNearest();
                }
                break;
            case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4': case 'Digit5':
                const slot = parseInt(e.code.replace('Digit', '')) - 1;
                this.game.player?.selectSlot(slot);
                this.updateHotbar();
                break;
            case 'Escape':
                if (this.sidePanelOpen) this.toggleSidePanel();
                else if (this.mapOpen) this.toggleMap();
                else if (this.helpOpen) this.toggleHelp();
                else if (this.game.dialogue.active) this.game.dialogue.close();
                break;
        }
    }

    // ==================== SCREEN MANAGEMENT ====================

    showScreen(screen) {
        // Hide all screens
        this.titleScreen?.classList.remove('active');
        this.charCreation?.classList.remove('active');
        this.loadingScreen?.classList.remove('active');
        this.settingsScreen?.classList.remove('active');
        this.hud?.classList.add('hidden');
        this.deathScreen?.classList.add('hidden');

        switch (screen) {
            case 'title':
                this.titleScreen?.classList.add('active');
                break;
            case 'creation':
                this.charCreation?.classList.add('active');
                break;
            case 'loading':
                this.loadingScreen?.classList.add('active');
                break;
            case 'settings':
                this.settingsScreen?.classList.add('active');
                break;
            case 'hud':
                this.hud?.classList.remove('hidden');
                break;
        }
    }

    showDeathScreen() {
        this.deathScreen?.classList.remove('hidden');
    }

    hideDeathScreen() {
        this.deathScreen?.classList.add('hidden');
    }

    setLoadingProgress(percent, text) {
        const bar = document.getElementById('loading-bar');
        const loadText = document.getElementById('loading-text');
        const subText = document.getElementById('loading-subtext');
        if (bar) bar.style.width = percent + '%';
        if (loadText && text) loadText.textContent = text;
        if (subText) subText.textContent = percent < 100 ? 'The AI is crafting your unique adventure' : 'Ready!';
    }

    // ==================== CHARACTER CREATION ====================

    selectClass(className) {
        this.game.selectedClass = className;
        document.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
        document.querySelector(`.class-card[data-class="${className}"]`)?.classList.add('selected');

        const classData = CONFIG.CLASSES[className];
        if (classData) {
            document.getElementById('class-desc').textContent = classData.desc;
        }
    }

    adjustStat(stat, action) {
        const val = this.game.creationStats[stat];
        if (action === 'inc' && this.game.statPoints > 0 && val < 15) {
            this.game.creationStats[stat]++;
            this.game.statPoints--;
        } else if (action === 'dec' && val > 1) {
            this.game.creationStats[stat]--;
            this.game.statPoints++;
        }
        this.updateCreationStats();
    }

    updateCreationStats() {
        document.getElementById('points-remaining').textContent = this.game.statPoints;
        Object.keys(this.game.creationStats).forEach(stat => {
            const el = document.getElementById(`stat-${stat}-val`);
            if (el) el.textContent = this.game.creationStats[stat];
        });
    }

    // ==================== API STATUS ====================

    updateApiStatus() {
        const status = document.getElementById('api-status');
        const text = document.getElementById('api-status-text');
        if (!status || !text) return;

        if (this.game.ai.enabled) {
            status.className = 'api-status connected';
            text.textContent = 'API Key Set - AI Features Active';
        } else {
            status.className = 'api-status disconnected';
            text.textContent = 'No API Key Set';
        }
    }

    async testApiKey() {
        const result = document.getElementById('api-test-result');
        const status = document.getElementById('api-status');
        const text = document.getElementById('api-status-text');

        if (!this.game.ai.apiKey) {
            if (result) result.textContent = 'No API key to test';
            return;
        }

        if (status) status.className = 'api-status connecting';
        if (text) text.textContent = 'Testing connection...';
        if (result) result.textContent = 'Sending test request...';

        const success = await this.game.ai.testConnection();
        if (success) {
            if (status) status.className = 'api-status connected';
            if (text) text.textContent = 'Connected - AI Features Active';
            if (result) { result.textContent = 'Connection successful!'; result.style.color = '#50fa7b'; }
        } else {
            if (status) status.className = 'api-status disconnected';
            if (text) text.textContent = 'Connection Failed';
            if (result) { result.textContent = 'Test failed. Check your API key.'; result.style.color = '#ff5555'; }
        }
    }

    // ==================== HUD UPDATE ====================

    update(dt) {
        if (this.game.state !== 'playing' || !this.game.player) return;

        const p = this.game.player;

        // Bars
        if (this.hpBar) {
            this.hpBar.style.width = `${Math.max(0, (p.hp / p.maxHp) * 100)}%`;
            this.hpText.textContent = `HP ${Math.ceil(p.hp)}/${p.maxHp}`;
        }
        if (this.mpBar) {
            this.mpBar.style.width = `${Math.max(0, (p.mp / p.maxMp) * 100)}%`;
            this.mpText.textContent = `MP ${Math.ceil(p.mp)}/${p.maxMp}`;
        }
        if (this.stBar) {
            this.stBar.style.width = `${Math.max(0, (p.stamina / p.maxStamina) * 100)}%`;
            this.stText.textContent = `ST ${Math.ceil(p.stamina)}/${p.maxStamina}`;
        }
        if (this.xpBar) {
            this.xpBar.style.width = `${Math.max(0, (p.xp / p.xpToNext) * 100)}%`;
            this.xpText.textContent = `XP ${p.xp}/${p.xpToNext}`;
        }

        // Mini stats
        if (this.hudLevel) this.hudLevel.textContent = p.level;
        if (this.hudSP) this.hudSP.textContent = p.skillPoints;
        if (this.hudGold) this.hudGold.textContent = p.gold;

        // World info
        if (this.game.worldLore && this.hudWorldName) {
            this.hudWorldName.textContent = this.game.worldLore.worldName || 'Aethelgard';
        }
        if (this.hudRegion) {
            this.hudRegion.textContent = this.getRegionName();
        }
        if (this.hudTime) {
            const w = this.game.world;
            const hours = Math.floor(w.time);
            const mins = Math.floor((w.time % 1) * 60);
            this.hudTime.textContent = `Day ${w.day} - ${hours}:${mins.toString().padStart(2, '0')}`;
        }

        // Active quest tracker
        this.updateQuestTracker();

        // Update status effects display
        this.updateStatusEffects();
    }

    getRegionName() {
        if (!this.game.player || !this.game.worldLore?.regions) return 'Unknown';

        const tile = this.game.world.getTile(this.game.player.x, this.game.player.y);
        if (!tile) return 'The Wilds';

        const regions = this.game.worldLore.regions;
        const biomeMap = {};
        regions.forEach(r => { biomeMap[r.biome] = r.name; });
        return biomeMap[tile.biome] || tile.biome.charAt(0).toUpperCase() + tile.biome.slice(1);
    }

    updateStatusEffects() {
        const container = document.getElementById('status-effects');
        if (!container || !this.game.player) return;

        container.innerHTML = '';
        this.game.player.statusEffects.forEach(effect => {
            const el = document.createElement('div');
            el.className = 'status-icon';
            el.textContent = effect.type[0].toUpperCase();
            el.title = `${effect.type} (${Math.ceil(effect.duration - effect.timer)}s)`;
            const colors = { poison: '#0f0', burn: '#f00', freeze: '#00f', stun: '#ff0', regen: '#4f4' };
            el.style.backgroundColor = colors[effect.type] || '#fff';
            container.appendChild(el);
        });
    }

    updateQuestTracker() {
        if (!this.questTracker) return;
        const active = this.game.questSystem.activeQuests;
        if (active.length === 0) {
            this.questTracker.textContent = 'No active quest';
        } else {
            const q = active[0];
            this.questTracker.innerHTML = `<strong>${q.title}</strong><br><small>${q.progress || 0}/${q.targetAmount || 1}</small>`;
        }
    }

    updateHotbar() {
        const slots = document.querySelectorAll('.hotbar-slot');
        slots.forEach((slot, i) => {
            slot.classList.toggle('active', i === this.game.selectedSlot);
        });
    }

    // ==================== SIDE PANEL ====================

    toggleSidePanel() {
        this.sidePanelOpen = !this.sidePanelOpen;
        this.sidePanel?.classList.toggle('hidden', !this.sidePanelOpen);
        if (this.sidePanelOpen) {
            this.refreshActiveTab();
        }
    }

    switchTab(tabName) {
        this.activeTab = tabName;
        document.querySelectorAll('.side-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
        document.getElementById(`tab-${tabName}`)?.classList.add('active');
        this.refreshActiveTab();
    }

    refreshActiveTab() {
        switch (this.activeTab) {
            case 'inventory': this.renderInventory(); break;
            case 'skills': this.renderSkillTree(); break;
            case 'quests': this.renderQuests(); break;
            case 'stats': this.renderStats(); break;
        }
    }

    // ==================== INVENTORY RENDERING ====================

    renderInventory() {
        const grid = document.getElementById('inv-grid');
        if (!grid) return;
        grid.innerHTML = '';

        // Equipped display
        const weapon = this.game.inventory.equipped.weapon;
        const armor = this.game.inventory.equipped.armor;
        const accessory = this.game.inventory.equipped.accessory;
        const eqWeapon = document.getElementById('equip-weapon');
        const eqArmor = document.getElementById('equip-armor');
        const eqAccessory = document.getElementById('equip-accessory');
        if (eqWeapon) eqWeapon.textContent = weapon ? weapon.name : 'None';
        if (eqArmor) eqArmor.textContent = armor ? armor.name : 'None';
        if (eqAccessory) eqAccessory.textContent = accessory ? accessory.name : 'None';

        // Inventory grid
        const items = this.game.inventory.items;
        for (let i = 0; i < 30; i++) {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';

            if (i < items.length) {
                const item = items[i];
                slot.classList.add('has-item', `rarity-${item.rarity || 'common'}`);
                slot.textContent = this.getItemIcon(item);
                slot.title = item.name || 'Item';

                slot.addEventListener('click', () => this.game.inventory.use(item));
                slot.addEventListener('mouseenter', (e) => this.showItemTooltip(e, item));
                slot.addEventListener('mouseleave', () => this.hideItemTooltip());
            }

            grid.appendChild(slot);
        }
    }

    getItemIcon(item) {
        const icons = {
            gold: '\ud83d\udcb0', potion: '\ud83e\uddea', sword: '\u2694\ufe0f', bow: '\ud83c\udff9',
            staff: '\ud83e\ude84', weapon: '\u2694\ufe0f', armor: '\ud83d\udee1\ufe0f', accessory: '\ud83d\udc8d',
            light: '\ud83d\udc55', medium: '\ud83e\udde5', heavy: '\ud83e\udd3c'
        };
        return icons[item.type] || '\ud83d\udce6';
    }

    showItemTooltip(e, item) {
        if (!this.itemPopup) return;
        this.itemPopup.classList.remove('hidden');
        this.itemPopup.style.left = (e.clientX + 10) + 'px';
        this.itemPopup.style.top = (e.clientY + 10) + 'px';

        document.getElementById('item-popup-name').textContent = item.name || 'Unknown';
        document.getElementById('item-popup-name').style.color = CONFIG.RARITY_COLORS[item.rarity] || '#888';
        document.getElementById('item-popup-type').textContent = `${(item.rarity || 'common').toUpperCase()} ${item.type}`;
        document.getElementById('item-popup-icon').textContent = this.getItemIcon(item);

        const statsDiv = document.getElementById('item-popup-stats');
        statsDiv.innerHTML = '';
        if (item.stats) {
            Object.entries(item.stats).forEach(([key, val]) => {
                if (val) {
                    const div = document.createElement('div');
                    div.className = 'item-popup-stat';
                    div.innerHTML = `<span>${key}</span><span style="color:#d4a853">+${val}</span>`;
                    statsDiv.appendChild(div);
                }
            });
        }

        const desc = document.getElementById('item-popup-desc');
        desc.textContent = item.description || '';

        const lore = document.getElementById('item-popup-lore');
        lore.textContent = item.lore || '';

        const value = document.getElementById('item-popup-value');
        value.textContent = item.value ? `Value: ${item.value} gold` : '';
    }

    hideItemTooltip() {
        this.itemPopup?.classList.add('hidden');
    }

    updateInventory(items) {
        if (this.sidePanelOpen && this.activeTab === 'inventory') {
            this.renderInventory();
        }
    }

    // ==================== SKILL TREE RENDERING ====================

    renderSkillTree() {
        const container = document.getElementById('skill-branches');
        const spDisplay = document.getElementById('skill-points');
        if (!container) return;

        if (spDisplay && this.game.player) {
            spDisplay.textContent = this.game.player.skillPoints;
        }

        container.innerHTML = '';
        const tree = this.game.skillTree;

        for (const branchName in tree.skills) {
            const branch = tree.skills[branchName];
            const branchDiv = document.createElement('div');
            branchDiv.className = 'skill-branch';
            branchDiv.innerHTML = `<h4>${branchName.charAt(0).toUpperCase() + branchName.slice(1)}</h4>`;

            for (const skillId in branch) {
                const skill = branch[skillId];
                const isLearned = tree.unlocked.has(skillId);
                const canLearn = !isLearned &&
                    (!skill.requires || tree.unlocked.has(skill.requires)) &&
                    (this.game.player?.skillPoints >= skill.cost);

                const node = document.createElement('div');
                node.className = `skill-node ${isLearned ? 'learned' : canLearn ? 'available' : 'locked'}`;
                node.innerHTML = `
                    <span class="skill-icon">${skill.icon}</span>
                    <div class="skill-info">
                        <span class="skill-name-text">${skill.name}</span>
                        <span class="skill-desc-text">${skill.desc}</span>
                    </div>
                    <span class="skill-cost">${isLearned ? 'Learned' : `${skill.cost} SP`}</span>
                `;

                if (canLearn) {
                    node.addEventListener('click', () => {
                        tree.unlock(skillId);
                        this.renderSkillTree();
                    });
                }

                branchDiv.appendChild(node);
            }

            container.appendChild(branchDiv);
        }
    }

    // ==================== QUEST RENDERING ====================

    renderQuests() {
        const activeList = document.getElementById('quest-list');
        const completedList = document.getElementById('quest-completed-list');
        if (!activeList) return;

        activeList.innerHTML = '';
        this.game.questSystem.activeQuests.forEach(q => {
            const div = document.createElement('div');
            div.className = 'quest-item';
            const pct = q.targetAmount > 0 ? Math.min(100, (q.progress / q.targetAmount) * 100) : 0;
            div.innerHTML = `
                <div class="quest-title">${q.title}</div>
                <div class="quest-desc">${q.description || ''}</div>
                <div class="quest-progress"><div class="quest-progress-bar" style="width:${pct}%"></div></div>
                <div class="quest-reward">Reward: ${q.rewards?.xp || 0} XP, ${q.rewards?.gold || 0} Gold</div>
            `;
            activeList.appendChild(div);
        });

        if (this.game.questSystem.activeQuests.length === 0) {
            activeList.innerHTML = '<p style="color:#888;font-size:0.85rem;">No active quests. Talk to NPCs!</p>';
        }

        if (completedList) {
            completedList.innerHTML = '';
            this.game.questSystem.completedQuests.forEach(q => {
                const div = document.createElement('div');
                div.className = 'quest-item completed';
                div.innerHTML = `<div class="quest-title">${q.title}</div>`;
                completedList.appendChild(div);
            });
        }
    }

    updateQuests(quests) {
        if (this.sidePanelOpen && this.activeTab === 'quests') {
            this.renderQuests();
        }
        this.updateQuestTracker();
    }

    // ==================== STATS RENDERING ====================

    renderStats() {
        const container = document.getElementById('stats-display');
        if (!container || !this.game.player) return;

        const p = this.game.player;
        container.innerHTML = '';
        const stats = [
            ['Name', p.charName],
            ['Class', CONFIG.CLASSES[p.className]?.name || p.className],
            ['Level', p.level],
            ['XP', `${p.xp} / ${p.xpToNext}`],
            ['---', ''],
            ['STR', p.str],
            ['AGI', p.agi],
            ['INT', p.int],
            ['VIT', p.vit],
            ['CHA', p.cha],
            ['---', ''],
            ['Damage', Math.floor(p.damage + p.equipBonusDamage)],
            ['Defense', p.defense],
            ['Crit Chance', (p.critChance * 100).toFixed(1) + '%'],
            ['Speed', Math.floor(p.speed)],
            ['---', ''],
            ['HP', `${Math.ceil(p.hp)} / ${p.maxHp}`],
            ['MP', `${Math.ceil(p.mp)} / ${p.maxMp}`],
            ['Stamina', `${Math.ceil(p.stamina)} / ${p.maxStamina}`],
            ['Gold', p.gold],
            ['Skill Points', p.skillPoints]
        ];

        stats.forEach(([label, val]) => {
            if (label === '---') {
                const hr = document.createElement('hr');
                hr.style.borderColor = '#2a2a3a';
                hr.style.margin = '6px 0';
                container.appendChild(hr);
            } else {
                const div = document.createElement('div');
                div.className = 'stat-line';
                div.innerHTML = `<span class="stat-label">${label}</span><span class="stat-val">${val}</span>`;
                container.appendChild(div);
            }
        });
    }

    // ==================== MAP ====================

    toggleMap() {
        this.mapOpen = !this.mapOpen;
        this.mapOverlay?.classList.toggle('hidden', !this.mapOpen);
        if (this.mapOpen) {
            this.renderMap();
        }
    }

    renderMap() {
        const canvas = document.getElementById('map-canvas');
        if (!canvas || !this.game.world.tiles.length) return;

        const size = Math.min(600, window.innerWidth - 40);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const scale = size / CONFIG.WORLD_SIZE;

        // Draw tiles
        for (let y = 0; y < CONFIG.WORLD_SIZE; y++) {
            for (let x = 0; x < CONFIG.WORLD_SIZE; x++) {
                const tile = this.game.world.tiles[y][x];
                ctx.fillStyle = CONFIG.COLORS[tile.biome] || '#000';
                ctx.fillRect(x * scale, y * scale, Math.ceil(scale), Math.ceil(scale));
            }
        }

        // Draw entities (NPCs, enemies)
        this.game.entities.forEach(e => {
            const ex = (e.x / CONFIG.TILE_SIZE) * scale;
            const ey = (e.y / CONFIG.TILE_SIZE) * scale;
            if (e.constructor.name === 'NPC') {
                ctx.fillStyle = '#bd93f9';
            } else if (e.constructor.name === 'Enemy') {
                ctx.fillStyle = '#ff4444';
            } else {
                ctx.fillStyle = '#888';
            }
            ctx.fillRect(ex - 1, ey - 1, 3, 3);
        });

        // Draw player
        if (this.game.player) {
            const px = (this.game.player.x / CONFIG.TILE_SIZE) * scale;
            const py = (this.game.player.y / CONFIG.TILE_SIZE) * scale;
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Map title
        const title = document.getElementById('map-title');
        if (title && this.game.worldLore) {
            title.textContent = this.game.worldLore.worldName || 'World Map';
        }
    }

    // ==================== HELP ====================

    toggleHelp() {
        this.helpOpen = !this.helpOpen;
        this.helpOverlay?.classList.toggle('hidden', !this.helpOpen);
    }

    // ==================== CHAT ====================

    sendChat() {
        const input = document.getElementById('chat-input');
        if (!input || !input.value.trim()) return;

        const msg = input.value.trim();
        input.value = '';

        this.addChatMessage('player', this.game.player?.charName || 'You', msg);

        // If dialogue active, route to dialogue system
        if (this.game.dialogue.active) {
            this.game.dialogue.selectOption(msg);
        }
    }

    addChatMessage(type, sender, text) {
        const log = document.getElementById('chat-log');
        if (!log) return;

        const div = document.createElement('div');
        div.className = `chat-message ${type}`;
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        div.innerHTML = `<span class="chat-time">[${time}]</span> <span class="chat-sender">${sender}:</span> ${text}`;
        log.appendChild(div);
        log.scrollTop = log.scrollHeight;
    }

    // ==================== INTERACT ====================

    interactNearest() {
        if (!this.game.player) return;

        const px = this.game.player.x;
        const py = this.game.player.y;
        const interactRange = 60;

        // Find nearest NPC
        let nearestNPC = null;
        let nearestDist = Infinity;

        this.game.entities.forEach(e => {
            if (e.constructor.name !== 'NPC') return;
            const dist = Math.hypot(e.x - px, e.y - py);
            if (dist < interactRange && dist < nearestDist) {
                nearestDist = dist;
                nearestNPC = e;
            }
        });

        if (nearestNPC) {
            this.game.dialogue.start(nearestNPC);
            return;
        }

        // Find nearest interactable
        this.game.entities.forEach(e => {
            if (e.constructor.name !== 'Interactable') return;
            const dist = Math.hypot(e.x - px, e.y - py);
            if (dist < interactRange && e.interact) {
                e.interact();
            }
        });
    }

    // ==================== NOTIFICATIONS ====================

    notify(message, type = 'info') {
        if (!this.notificationArea) return;

        const icons = { info: '\u2139\ufe0f', success: '\u2705', warning: '\u26a0\ufe0f', error: '\u274c', combat: '\u2694\ufe0f', loot: '\ud83d\udcb0', ai: '\u2728' };

        const notif = document.createElement('div');
        notif.className = `notification ${type}`;
        notif.innerHTML = `<span>${icons[type] || '\u2022'}</span> <span>${message}</span>`;

        this.notificationArea.appendChild(notif);

        setTimeout(() => {
            notif.style.opacity = '0';
            notif.style.transform = 'translateY(-20px)';
            setTimeout(() => notif.remove(), 300);
        }, 4000);
    }

    showPopup(text, x, y, color) {
        if (this.game.render) {
            this.game.render.addFloatingText(text, x, y, color);
        }
    }

    // ==================== EVENT BANNER ====================

    showEventBanner(title, description, icon) {
        if (!this.eventBanner) return;
        document.getElementById('event-banner-title').textContent = title;
        document.getElementById('event-banner-desc').textContent = description;
        document.getElementById('event-banner-icon').textContent = icon || '\u2728';
        this.eventBanner.classList.remove('hidden');

        setTimeout(() => {
            this.eventBanner.classList.add('hidden');
        }, 6000);
    }

    // ==================== GEN LOG ====================

    addGenLog(entry) {
        const content = document.getElementById('gen-log-content');
        if (!content) return;
        const div = document.createElement('div');
        div.className = 'gen-log-entry';
        div.textContent = `[${new Date().toLocaleTimeString()}] ${entry}`;
        content.appendChild(div);
        content.scrollTop = content.scrollHeight;

        // Show log briefly
        this.genLog?.classList.remove('hidden');
        clearTimeout(this._genLogTimeout);
        this._genLogTimeout = setTimeout(() => {
            this.genLog?.classList.add('hidden');
        }, 5000);
    }

    // ==================== SETTINGS ====================

    applySettings(settings) {
        const musicVol = document.getElementById('music-volume');
        const sfxVol = document.getElementById('sfx-volume');
        const diff = document.getElementById('difficulty-setting');
        const aiLen = document.getElementById('ai-length-setting');

        if (musicVol) musicVol.value = settings.musicVolume;
        if (sfxVol) sfxVol.value = settings.sfxVolume;
        if (diff) diff.value = settings.difficulty;
        if (aiLen) aiLen.value = settings.aiLength;
    }

    saveSettingsFromUI() {
        this.game.settings.musicVolume = parseInt(document.getElementById('music-volume')?.value || 50);
        this.game.settings.sfxVolume = parseInt(document.getElementById('sfx-volume')?.value || 70);
        this.game.settings.difficulty = document.getElementById('difficulty-setting')?.value || 'normal';
        this.game.settings.aiLength = document.getElementById('ai-length-setting')?.value || 'medium';
        this.game.saveSettings();
    }
}
