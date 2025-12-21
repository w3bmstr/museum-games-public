// menu.js
// Simple in‑game menu (restart, undo, return to museum).

export function createMenu(game) {
    return {
        restart: () => game.restart(),
        undo: () => game.undo(),
        backToMuseum: () => window.location.href = "../index.html"
    };
}
