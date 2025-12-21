import { COLS, ROWS, RED, BLACK, cloneBoard, applyMove } from "./board.js";

export function inBounds(x, y) { return x >= 0 && x < COLS && y >= 0 && y < ROWS; }

export function inPalace(x, y, color) {
	return color === BLACK
		? x >= 3 && x <= 5 && y >= 0 && y <= 2
		: x >= 3 && x <= 5 && y >= 7 && y <= 9;
}

export function sameSideOfRiver(y1, y2, color) {
	return color === BLACK ? (y1 <= 4 && y2 <= 4) : (y1 >= 5 && y2 >= 5);
}

export function hasCrossedRiver(y, color) {
	return color === BLACK ? y >= 5 : y <= 4;
}

export function findGeneral(color, board) {
	for (let y = 0; y < ROWS; y++) {
		for (let x = 0; x < COLS; x++) {
			const p = board[y][x];
			if (p && p.color === color && p.type === 'G') return { x, y };
		}
	}
	return null;
}

export function getPseudoMoves(board, x, y) {
	const piece = board[y][x];
	if (!piece) return [];
	const { color, type } = piece;
	const moves = [];

	if (type === 'G') {
		const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
		for (const [dx, dy] of dirs) {
			const nx = x + dx, ny = y + dy;
			if (!inBounds(nx, ny) || !inPalace(nx, ny, color)) continue;
			const t = board[ny][nx];
			if (!t || t.color !== color) moves.push({ x: nx, y: ny });
		}
	} else if (type === 'A') {
		for (const [dx, dy] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
			const nx = x + dx, ny = y + dy;
			if (!inBounds(nx, ny) || !inPalace(nx, ny, color)) continue;
			const t = board[ny][nx];
			if (!t || t.color !== color) moves.push({ x: nx, y: ny });
		}
	} else if (type === 'E') {
		for (const [dx, dy] of [[2,2],[2,-2],[-2,2],[-2,-2]]) {
			const nx = x + dx, ny = y + dy;
			const ex = x + dx/2, ey = y + dy/2;
			if (!inBounds(nx, ny)) continue;
			if (!sameSideOfRiver(y, ny, color)) continue;
			if (board[ey][ex]) continue; // elephant eye blocked
			const t = board[ny][nx];
			if (!t || t.color !== color) moves.push({ x: nx, y: ny });
		}
	} else if (type === 'H') {
		const defs = [
			{ leg:[1,0], dest:[2,1] }, { leg:[1,0], dest:[2,-1] },
			{ leg:[-1,0], dest:[-2,1] }, { leg:[-1,0], dest:[-2,-1] },
			{ leg:[0,1], dest:[1,2] }, { leg:[0,1], dest:[-1,2] },
			{ leg:[0,-1], dest:[1,-2] }, { leg:[0,-1], dest:[-1,-2] }
		];
		for (const m of defs) {
			const lx = x + m.leg[0], ly = y + m.leg[1];
			if (!inBounds(lx, ly) || board[ly][lx]) continue; // horse leg blocked
			const nx = x + m.dest[0], ny = y + m.dest[1];
			if (!inBounds(nx, ny)) continue;
			const t = board[ny][nx];
			if (!t || t.color !== color) moves.push({ x: nx, y: ny });
		}
	} else if (type === 'R') {
		for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
			let nx = x + dx, ny = y + dy;
			while (inBounds(nx, ny)) {
				const t = board[ny][nx];
				if (!t) moves.push({ x: nx, y: ny });
				else { if (t.color !== color) moves.push({ x: nx, y: ny }); break; }
				nx += dx; ny += dy;
			}
		}
	} else if (type === 'C') {
		for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
			let nx = x + dx, ny = y + dy;
			while (inBounds(nx, ny) && !board[ny][nx]) { moves.push({ x: nx, y: ny }); nx += dx; ny += dy; }
			nx += dx; ny += dy; // jump exactly one screen
			while (inBounds(nx, ny)) {
				const t = board[ny][nx];
				if (t) { if (t.color !== color) moves.push({ x: nx, y: ny }); break; }
				nx += dx; ny += dy;
			}
		}
	} else if (type === 'S') {
		const dir = color === RED ? -1 : 1;
		const ny = y + dir;
		if (inBounds(x, ny)) {
			const t = board[ny][x]; if (!t || t.color !== color) moves.push({ x, y: ny });
		}
		if (hasCrossedRiver(y, color)) {
			for (const dx of [-1, 1]) {
				const nx = x + dx; if (!inBounds(nx, y)) continue;
				const t = board[y][nx]; if (!t || t.color !== color) moves.push({ x: nx, y });
			}
		}
	}

	return moves;
}

export function violatesFlyingGeneral(board) {
	const redG = findGeneral(RED, board);
	const blackG = findGeneral(BLACK, board);
	if (!redG || !blackG) return false;
	if (redG.x !== blackG.x) return false;
	const x = redG.x;
	const [y1, y2] = redG.y < blackG.y ? [redG.y, blackG.y] : [blackG.y, redG.y];
	for (let y = y1 + 1; y < y2; y++) {
		if (board[y][x]) return false; // blocked, so not facing
	}
	return true;
}

export function isInCheck(board, color) {
	const gen = findGeneral(color, board);
	if (!gen) return false;
	const enemy = color === RED ? BLACK : RED;

	// Flying general counts as check
	const redG = findGeneral(RED, board);
	const blackG = findGeneral(BLACK, board);
	if (redG && blackG && redG.x === blackG.x) {
		const x = redG.x;
		let blocked = false;
		const [y1, y2] = redG.y < blackG.y ? [redG.y, blackG.y] : [blackG.y, redG.y];
		for (let y = y1 + 1; y < y2; y++) { if (board[y][x]) { blocked = true; break; } }
		if (!blocked) return true;
	}

	for (let y = 0; y < ROWS; y++) {
		for (let x = 0; x < COLS; x++) {
			const p = board[y][x];
			if (!p || p.color !== enemy) continue;
			const pseudo = getPseudoMoves(board, x, y);
			if (pseudo.some(m => m.x === gen.x && m.y === gen.y)) return true;
		}
	}
	return false;
}

export function legalMovesFrom(board, x, y, color) {
	const p = board[y][x];
	if (!p || p.color !== color) return [];
	const pseudo = getPseudoMoves(board, x, y);
	const legal = [];
	for (const m of pseudo) {
		const bCopy = cloneBoard(board);
		applyMove(bCopy, { x, y }, m);
		if (violatesFlyingGeneral(bCopy)) continue;
		if (isInCheck(bCopy, color)) continue;
		legal.push(m);
	}
	return legal;
}

export function legalMovesForColor(board, color) {
	const moves = [];
	for (let y = 0; y < ROWS; y++) {
		for (let x = 0; x < COLS; x++) {
			const p = board[y][x];
			if (!p || p.color !== color) continue;
			for (const mv of legalMovesFrom(board, x, y, color)) {
				moves.push({ from: { x, y }, to: mv, piece: p });
			}
		}
	}
	return moves;
}

export function hasAnyLegalMove(board, color) {
	return legalMovesForColor(board, color).length > 0;
}
