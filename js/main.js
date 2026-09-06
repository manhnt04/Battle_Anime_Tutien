import { Game } from './game.js';
import { UI } from './ui.js';

const canvas = document.getElementById('gameCanvas');
const minimapCanvas = document.getElementById('minimapCanvas');

const game = new Game(canvas, minimapCanvas);
if (typeof game.initRenderer === 'function') {
    await game.initRenderer();
}
const ui = new UI(game);

// Override game methods to hook into UI
const originalVictory = game.showVictory.bind(game);
game.showVictory = function() {
    originalVictory();
    ui.showVictory();
};

const originalGameOver = game.showGameOver.bind(game);
game.showGameOver = function(place) {
    originalGameOver(place);
    ui.showGameOver(place);
};

// Hook pause to manage pause overlay
const originalPause = game.pause.bind(game);
game.pause = function() {
    originalPause();
    const pauseModal = document.getElementById('pause-modal');
    if (pauseModal) {
        pauseModal.style.display = game.state === 'paused' ? 'flex' : 'none';
    }
};

const originalQuit = ui.quitToMenu.bind(ui);
ui.quitToMenu = function() {
    const pauseModal = document.getElementById('pause-modal');
    if (pauseModal) pauseModal.style.display = 'none';
    originalQuit();
};

// HUD update loop
setInterval(() => ui.updateHUD(), 100);

console.log('Circle Royale loaded!');
