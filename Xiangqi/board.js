// Board helpers for Xiangqi

export const COLS = 9;
export const ROWS = 10;
export const RED = 'r';
export const BLACK = 'b';

export function createEmptyBoard() {
	return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

export function createInitialBoard() {
	const b = createEmptyBoard();
	const place = (x, y, color, type) => { b[y][x] = { color, type }; };

	// Black (top)
	place(4, 0, BLACK, 'G');
	place(3, 0, BLACK, 'A'); place(5, 0, BLACK, 'A');
	place(2, 0, BLACK, 'E'); place(6, 0, BLACK, 'E');
	place(1, 0, BLACK, 'H'); place(7, 0, BLACK, 'H');
	place(0, 0, BLACK, 'R'); place(8, 0, BLACK, 'R');
	place(1, 2, BLACK, 'C'); place(7, 2, BLACK, 'C');
	for (const x of [0, 2, 4, 6, 8]) place(x, 3, BLACK, 'S');

	// Red (bottom)
	place(4, 9, RED, 'G');
	place(3, 9, RED, 'A'); place(5, 9, RED, 'A');
	place(2, 9, RED, 'E'); place(6, 9, RED, 'E');
	place(1, 9, RED, 'H'); place(7, 9, RED, 'H');
	place(0, 9, RED, 'R'); place(8, 9, RED, 'R');
	place(1, 7, RED, 'C'); place(7, 7, RED, 'C');
	for (const x of [0, 2, 4, 6, 8]) place(x, 6, RED, 'S');

	return b;
}

export function cloneBoard(board) {
	return board.map(row => row.map(p => p ? { color: p.color, type: p.type } : null));
}

export function applyMove(board, from, to) {
	const piece = board[from.y][from.x];
	board[to.y][to.x] = piece;
	board[from.y][from.x] = null;
}

export function hashPosition(board, turn) {
	const rows = board.map(row => row.map(p => p ? `${p.color}${p.type}` : '..').join('')).join('|');
	return `${turn}|${rows}`;
}

export function fileLetter(x) {
	return String.fromCharCode('a'.charCodeAt(0) + x);
}

export function rankNumber(y) {
	return String(ROWS - y);
}
