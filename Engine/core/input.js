// input.js
// Universal input handler for mouse, keyboard, and controller.
// Each game receives events through game.handleInput().

export function attachInputHandlers(game, layers) {
    const ui = layers.ui;

    ui.addEventListener("mousedown", e => game.handleInput("mouseDown", e));
    ui.addEventListener("mouseup", e => game.handleInput("mouseUp", e));
    ui.addEventListener("mousemove", e => game.handleInput("mouseMove", e));

    window.addEventListener("keydown", e => game.handleInput("keyDown", e));
}
