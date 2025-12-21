// renderer.js
// Handles drawing the board, pieces, and UI overlays.
// Each game provides its own drawBoard() and drawPieces() functions.

export function render(game, layers) {
    const { board, pieces, ui } = layers;

    game.drawBoard(board.getContext("2d"));
    game.drawPieces(pieces.getContext("2d"));
    game.drawUI(ui.getContext("2d"));
}
