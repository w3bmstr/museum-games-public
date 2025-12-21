// history.js
// Undo/redo system shared by all games.

export function pushState(history, state) {
    history.push(JSON.parse(JSON.stringify(state)));
}

export function popState(history) {
    return history.pop();
}
