// state.js
// Universal game state container used by all games.

export function createGameState() {
    return {
        board: null,
        pieces: [],
        turn: 0,
        moveHistory: [],
        selected: null,
        legalMoves: []
    };
}
