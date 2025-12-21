import { createGameState } from "../../Engine/core/state.js";

const SIZE = 19;
const BLACK = 1;
const WHITE = 2;
const STAR_POINTS = [3, 9, 15];

// Compute a hash of the board for simple ko prevention.
function hashBoard(board) {
	return board.map(row => row.join(""))
		.join("|");
}

function neighbors(x, y) {
	return [
		[x + 1, y],
		[x - 1, y],
		[x, y + 1],
		[x, y - 1]
	].filter(([nx, ny]) => nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE);
}

export function createGame() {
	const state = createGameState();
	let layers = null;
	const layout = { width: 0, height: 0, boardSize: 0, cellSize: 0, offsetX: 0, offsetY: 0 };
	const dpr = window.devicePixelRatio || 1;

	function init(layersIn) {
		layers = layersIn;
		initBoard();
		resize();
		window.addEventListener("resize", resize);
	}

	function initBoard() {
		state.board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
		state.turn = BLACK;
		state.moveHistory = [];
		state.lastMove = null;
		state.lastBoardHash = hashBoard(state.board);
		state.captures = { [BLACK]: 0, [WHITE]: 0 };
		state.passes = 0;
		state.gameOver = false;
		state.winner = null;
		state.score = { black: 0, white: 0 };
		state.message = "";
	}

	function resize() {
		layout.width = window.innerWidth;
		layout.height = window.innerHeight;

		[layers.board, layers.pieces, layers.ui].forEach(canvas => {
			canvas.width = layout.width * dpr;
			canvas.height = layout.height * dpr;
			canvas.style.width = `${layout.width}px`;
			canvas.style.height = `${layout.height}px`;
			const ctx = canvas.getContext("2d");
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		});

		layout.boardSize = Math.min(layout.width, layout.height) * 0.9;
		layout.cellSize = layout.boardSize / (SIZE - 1);
		layout.offsetX = (layout.width - layout.boardSize) / 2;
		layout.offsetY = (layout.height - layout.boardSize) / 2;
	}

	function update() {}

	function drawBoard(ctx) {
		ctx.clearRect(0, 0, layout.width, layout.height);
		ctx.fillStyle = "#111";
		ctx.fillRect(0, 0, layout.width, layout.height);

		const grad = ctx.createLinearGradient(layout.offsetX, layout.offsetY, layout.offsetX + layout.boardSize, layout.offsetY + layout.boardSize);
		grad.addColorStop(0, "#b28a5a");
		grad.addColorStop(1, "#d9b37c");
		ctx.fillStyle = grad;
		ctx.fillRect(layout.offsetX, layout.offsetY, layout.boardSize, layout.boardSize);

		ctx.strokeStyle = "#000";
		ctx.lineWidth = 1.5;
		for (let i = 0; i < SIZE; i++) {
			const x = layout.offsetX + i * layout.cellSize;
			ctx.beginPath();
			ctx.moveTo(x, layout.offsetY);
			ctx.lineTo(x, layout.offsetY + layout.boardSize);
			ctx.stroke();

			const y = layout.offsetY + i * layout.cellSize;
			ctx.beginPath();
			ctx.moveTo(layout.offsetX, y);
			ctx.lineTo(layout.offsetX + layout.boardSize, y);
			ctx.stroke();
		}

		ctx.fillStyle = "#000";
		for (const ry of STAR_POINTS) {
			for (const rx of STAR_POINTS) {
				const sx = layout.offsetX + rx * layout.cellSize;
				const sy = layout.offsetY + ry * layout.cellSize;
				ctx.beginPath();
				ctx.arc(sx, sy, layout.cellSize * 0.12, 0, Math.PI * 2);
				ctx.fill();
			}
		}
	}

	function drawPieces(ctx) {
		ctx.clearRect(0, 0, layout.width, layout.height);
		for (let y = 0; y < SIZE; y++) {
			for (let x = 0; x < SIZE; x++) {
				const v = state.board[y][x];
				if (!v) continue;

				const cx = layout.offsetX + x * layout.cellSize;
				const cy = layout.offsetY + y * layout.cellSize;
				const r = layout.cellSize * 0.45;

				ctx.beginPath();
				ctx.arc(cx, cy, r, 0, Math.PI * 2);

				const grad = ctx.createRadialGradient(
					cx - r * 0.3, cy - r * 0.3, r * 0.1,
					cx, cy, r
				);
				if (v === BLACK) {
					grad.addColorStop(0, "#555");
					grad.addColorStop(1, "#000");
				} else {
					grad.addColorStop(0, "#fff");
					grad.addColorStop(1, "#ccc");
				}

				ctx.fillStyle = grad;
				ctx.fill();
				ctx.strokeStyle = "rgba(0,0,0,0.4)";
				ctx.lineWidth = 1;
				ctx.stroke();

				// Last move marker
				if (state.lastMove && state.lastMove.x === x && state.lastMove.y === y) {
					ctx.fillStyle = v === BLACK ? "#fff" : "#000";
					ctx.beginPath();
					ctx.arc(cx, cy, r * 0.25, 0, Math.PI * 2);
					ctx.fill();
				}
			}
		}
	}

	function drawUI(ctx) {
		ctx.clearRect(0, 0, layout.width, layout.height);

		ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
		ctx.fillRect(14, 14, 300, 110);

		ctx.font = "16px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
		ctx.fillStyle = "#eee";
		ctx.fillText(`Turn: ${state.turn === BLACK ? "BLACK" : "WHITE"}`, 24, 38);
		ctx.fillText(`Moves: ${state.moveHistory.length}`, 24, 58);
		ctx.fillText(`Captures B:${state.captures[BLACK]} W:${state.captures[WHITE]}`, 24, 78);
		ctx.fillText(`Passes in a row: ${state.passes}`, 24, 98);
		ctx.fillText("Click to place · U undo · R restart · P pass", 24, 118);

		if (state.message) {
			ctx.fillStyle = "#ffd166";
			ctx.fillText(state.message, 24, 142);
		}

		if (state.gameOver) {
			ctx.fillStyle = "rgba(0,0,0,0.7)";
			ctx.fillRect(14, 160, 300, 70);
			ctx.fillStyle = "#fff";
			ctx.fillText(`Winner: ${state.winner}`, 24, 185);
			ctx.fillText(`Score B:${state.score.black} W:${state.score.white}`, 24, 205);
		}
	}

	function handleInput(type, event) {
		if (type === "mouseDown") handlePointer(event);
		else if (type === "keyDown") handleKey(event);
	}

	function handlePointer(event) {
		if (event.button !== 0) return;

		const mx = event.offsetX;
		const my = event.offsetY;
		const xLocal = mx - layout.offsetX;
		const yLocal = my - layout.offsetY;

		if (xLocal < -layout.cellSize / 2 || xLocal > layout.boardSize + layout.cellSize / 2 ||
			yLocal < -layout.cellSize / 2 || yLocal > layout.boardSize + layout.cellSize / 2) {
			return;
		}

		const gx = Math.round(xLocal / layout.cellSize);
		const gy = Math.round(yLocal / layout.cellSize);

		if (gx < 0 || gx >= SIZE || gy < 0 || gy >= SIZE) return;
		if (state.gameOver) return;
		if (state.board[gy][gx] !== 0) return;

		placeStoneWithRules(gx, gy);
	}

	function handleKey(event) {
		const key = event.key.toLowerCase();
		if (key === "r") {
			restart();
		} else if (key === "u") {
			undo();
		} else if (key === "p") {
			pass();
		}
	}

	function placeStoneWithRules(x, y) {
		const player = state.turn;

		// Tentatively place
		state.board[y][x] = player;

		// Capture adjacent enemy groups with no liberties
		let totalCaptured = 0;
		for (const [nx, ny] of neighbors(x, y)) {
			if (state.board[ny][nx] === 0 || state.board[ny][nx] === player) continue;
			const { stones, liberties } = collectGroup(nx, ny);
			if (liberties.size === 0) {
				for (const [sx, sy] of stones) state.board[sy][sx] = 0;
				totalCaptured += stones.length;
			}
		}

		// Check self-capture (suicide)
		const { liberties: myLiberties } = collectGroup(x, y);
		if (myLiberties.size === 0) {
			state.board[y][x] = 0;
			state.message = "Illegal: suicide move";
			return;
		}

		// Simple ko: disallow exact board repeat
		const newHash = hashBoard(state.board);
		if (newHash === state.lastBoardHash) {
			state.board[y][x] = 0;
			state.message = "Illegal: ko";
			return;
		}

		state.captures[player] += totalCaptured;
		state.lastBoardHash = newHash;
		state.lastMove = { x, y, player };
		state.moveHistory.push({ x, y, player });
		state.passes = 0;
		state.message = totalCaptured ? `Captured ${totalCaptured}` : "";
		state.turn = player === BLACK ? WHITE : BLACK;
	}

	function restart() {
		initBoard();
	}

	function undo() {
		const last = state.moveHistory.pop();
		if (!last) return;

		if (last.pass) {
			state.passes = Math.max(0, state.passes - 1);
			state.turn = last.player;
			state.message = "Undid pass";
			state.gameOver = false;
			state.winner = null;
			state.score = { black: 0, white: 0 };
			return;
		}

		// Rebuild board from history for correctness
		const fresh = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
		state.captures = { [BLACK]: 0, [WHITE]: 0 };
		for (const move of state.moveHistory) {
			if (move.pass) continue;
			fresh[move.y][move.x] = move.player;
			// We do not reconstruct captures; recalc ko hash from fresh board
		}
		state.board = fresh;
		state.turn = last.player;
		state.lastMove = state.moveHistory[state.moveHistory.length - 1] || null;
		state.lastBoardHash = hashBoard(state.board);
		state.passes = 0;
		state.gameOver = false;
		state.winner = null;
		state.score = { black: 0, white: 0 };
		state.message = "Undid move";
	}

	function pass() {
		if (state.gameOver) return;
		state.moveHistory.push({ pass: true, player: state.turn });
		state.lastMove = null;
		state.turn = state.turn === BLACK ? WHITE : BLACK;
		state.passes += 1;
		state.message = "Pass";

		if (state.passes >= 2) {
			scoreGame();
		}
	}

	function scoreGame() {
		const counts = { black: 0, white: 0 };
		// Stones on board
		for (let y = 0; y < SIZE; y++) {
			for (let x = 0; x < SIZE; x++) {
				if (state.board[y][x] === BLACK) counts.black += 1;
				else if (state.board[y][x] === WHITE) counts.white += 1;
			}
		}

		// Territory (simple area scoring)
		const visited = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
		for (let y = 0; y < SIZE; y++) {
			for (let x = 0; x < SIZE; x++) {
				if (visited[y][x] || state.board[y][x] !== 0) continue;
				const region = [];
				const queue = [[x, y]];
				visited[y][x] = true;
				const bordering = new Set();
				while (queue.length) {
					const [cx, cy] = queue.pop();
					region.push([cx, cy]);
					for (const [nx, ny] of neighbors(cx, cy)) {
						const v = state.board[ny][nx];
						if (v === 0 && !visited[ny][nx]) {
							visited[ny][nx] = true;
							queue.push([nx, ny]);
						} else if (v === BLACK) bordering.add(BLACK);
						else if (v === WHITE) bordering.add(WHITE);
					}
				}
				if (bordering.size === 1) {
					const owner = bordering.has(BLACK) ? "black" : "white";
					counts[owner] += region.length;
				}
			}
		}

		state.score = counts;
		const blackScore = counts.black + state.captures[BLACK];
		const whiteScore = counts.white + state.captures[WHITE];
		if (blackScore === whiteScore) state.winner = "Draw";
		else state.winner = blackScore > whiteScore ? "Black" : "White";
		state.message = `Final B:${blackScore} W:${whiteScore}`;
		state.gameOver = true;
	}

	function collectGroup(x, y) {
		const color = state.board[y][x];
		const seen = new Set();
		const liberties = new Set();
		const stones = [];
		const stack = [[x, y]];
		seen.add(`${x},${y}`);
		while (stack.length) {
			const [cx, cy] = stack.pop();
			stones.push([cx, cy]);
			for (const [nx, ny] of neighbors(cx, cy)) {
				const v = state.board[ny][nx];
				if (v === 0) liberties.add(`${nx},${ny}`);
				else if (v === color) {
					const key = `${nx},${ny}`;
					if (!seen.has(key)) {
						seen.add(key);
						stack.push([nx, ny]);
					}
				}
			}
		}
		return { stones, liberties };
	}

	return {
		init,
		update,
		drawBoard,
		drawPieces,
		drawUI,
		handleInput,
		getAIMove: () => null,
		restart,
		undo
	};
}
