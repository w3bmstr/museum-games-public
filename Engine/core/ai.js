// ai.js
// Universal AI interface. Each game provides its own getAIMove().

export async function computeAIMove(game, state) {
    return game.getAIMove(state);
}
