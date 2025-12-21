// Template game module
// Copy this folder to create a new game.

export function createGame() {
    return {
        init(layers) {},
        update() {},
        drawBoard(ctx) {},
        drawPieces(ctx) {},
        drawUI(ctx) {},
        handleInput(type, event) {},
        getAIMove(state) {},
        restart() {},
        undo() {}
    };
}
