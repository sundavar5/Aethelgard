import { Game } from './game.js';

window.onload = () => {
    console.log('Game Initializing...');
    const game = new Game();
    game.init();
};
