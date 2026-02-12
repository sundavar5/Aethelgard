import { Game } from './game.js';

window.onload = () => {
    console.log('Aethelgard Chronicles - Initializing...');
    const game = new Game();
    game.initSystems();
};

window.onbeforeunload = () => {
    const settings = localStorage.getItem('aethelgard_settings');
    // Settings are already saved by the game on change
};
