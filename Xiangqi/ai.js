import { cloneBoard, applyMove, RED, BLACK } from "./board.js";
import { legalMovesForColor, getPseudoMoves, isInCheck } from "./rules.js";

const VALUES = { G: 1000, R: 10, C: 7, H: 5, E: 3, A: 3, S: 2 };

function pieceValue(t) { return VALUES[t] || 0; }

function squareAttackedBy(board, color, x, y) {
	for (let yy = 0; yy < board.length; yy++) {
		for (let xx = 0; xx < board[0].length; xx++) {
			const p = board[yy][xx];
			if (!p || p.color !== color) continue;
			const pseudo = getPseudoMoves(board, xx, yy);
			if (pseudo.some(m => m.x === x && m.y === y)) return true;
		}
	}
	return false;
}

function evaluateMove(board, move, color) {
	const { from, to, piece } = move;
	const bCopy = cloneBoard(board);
	const target = bCopy[to.y][to.x];
	const captureScore = target ? pieceValue(target.type) * 12 : 0;

	applyMove(bCopy, from, to);

	let activity = 0;
	if (piece.type === 'S') {
		activity += (color === BLACK ? (to.y - from.y) : (from.y - to.y)) * 2;
		if (color === BLACK ? to.y >= 5 : to.y <= 4) activity += 2; // soldier across river
	}
	if (piece.type === 'R') {
		activity += 4 + (4 - Math.abs(to.x - 4));
	}
	if (piece.type === 'C') activity += 2;

	const danger = squareAttackedBy(bCopy, color === BLACK ? RED : BLACK, to.x, to.y)
		? pieceValue(piece.type) * 6
		: 0;

	// Bonus if move gives check
	const enemy = color === BLACK ? RED : BLACK;
	const checkBonus = isInCheck(bCopy, enemy) ? 30 : 0;

	return captureScore + activity + checkBonus - danger + Math.random() * 0.1;
}

export function chooseAIMove(board, color = BLACK, level = "medium") {
	const moves = legalMovesForColor(board, color);
	if (!moves.length) return null;
	if (level === "easy") return moves[Math.floor(Math.random() * moves.length)];

	let best = -Infinity;
	let bestMoves = [];
	for (const mv of moves) {
		const score = evaluateMove(board, mv, color);
		if (score > best) { best = score; bestMoves = [mv]; }
		else if (score === best) { bestMoves.push(mv); }
	}
	return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}
