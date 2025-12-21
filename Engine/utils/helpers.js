// helpers.js
// Small utility functions used across the engine.

export function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

