// canvas.js
// Sets up the 3‑layer canvas system: board, pieces, UI.
// Each game draws on these layers through the renderer.

export function createCanvasLayers(containerId = "game-container") {
    const container = document.getElementById(containerId);

    const board = document.createElement("canvas");
    const pieces = document.createElement("canvas");
    const ui = document.createElement("canvas");

    board.className = "layer-board";
    pieces.className = "layer-pieces";
    ui.className = "layer-ui";

    container.appendChild(board);
    container.appendChild(pieces);
    container.appendChild(ui);

    return { board, pieces, ui };
}
