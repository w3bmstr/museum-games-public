import { createInitialBoard, cloneBoard, applyMove, hashPosition, fileLetter, rankNumber, RED, BLACK, COLS, ROWS } from "./board.js";
import { legalMovesFrom, hasAnyLegalMove, isInCheck } from "./rules.js";
import { chooseAIMove } from "./ai.js";

export function createGame() {
	const state = {
		board: createInitialBoard(),
		turn: RED,
		selected: null,
		legal: [],
		gameOver: false,
		aiThinking: false,
		lastMove: null,
		moveHistory: [],
		posCounts: new Map(),
		info: "",
		status: "",
		repDraw: false,
		vsAI: true,
		aiLevel: "medium",
		menuActive: true,
		_undo: []
	};

	const layout = { width: 0, height: 0, cell: 0, boardW: 0, boardH: 0, offsetX: 0, offsetY: 0 };
	const dpr = window.devicePixelRatio || 1;
	let layers = null;
	let turnEl, aiEl, msgEl, lastEl, moveList;
	let btnStart, btnReset, btnUndo, btnHistory, btnHistoryClose;
	let startOverlay, btn1p, btn2p, btnEasy, btnMed, btnStartOverlay;
	let rulesOverlay, btnRules, btnCloseRules;

	function init(layersIn) {
		layers = layersIn;
		turnEl = document.getElementById("turn-text");
		aiEl = document.getElementById("ai-text");
		msgEl = document.getElementById("msg-text");
		lastEl = document.getElementById("lastmove-text");
		moveList = document.getElementById("move-list");
		btnStart = document.getElementById("btn-start");
		btnReset = document.getElementById("btn-reset");
		btnUndo = document.getElementById("btn-undo");
		btnHistory = document.getElementById("btn-history");
		btnHistoryClose = document.getElementById("btn-history-close");
		startOverlay = document.getElementById("start-overlay");
		btn1p = document.getElementById("btn-1p");
		btn2p = document.getElementById("btn-2p");
		btnEasy = document.getElementById("btn-easy");
		btnMed = document.getElementById("btn-med");
		btnStartOverlay = document.getElementById("btn-start-overlay");
		rulesOverlay = document.getElementById("rules-overlay");
		btnRules = document.getElementById("btn-rules");
		btnCloseRules = document.getElementById("close-rules");

		btnStart.addEventListener("click", showStart);
		btnReset.addEventListener("click", restart);
		btnUndo.addEventListener("click", undo);
		btnHistory?.addEventListener("click", () => toggleHistory(true));
		btnHistoryClose?.addEventListener("click", () => toggleHistory(false));
		btn1p.addEventListener("click", () => setPlayers(true));
		btn2p.addEventListener("click", () => setPlayers(false));
		btnEasy.addEventListener("click", () => setDifficulty("easy"));
		btnMed.addEventListener("click", () => setDifficulty("medium"));
		btnStartOverlay.addEventListener("click", startFromOverlay);
		btnRules.addEventListener("click", () => rulesOverlay.classList.toggle("show", true));
		btnCloseRules.addEventListener("click", () => rulesOverlay.classList.remove("show"));
		window.addEventListener("resize", resize);
		setPlayers(state.vsAI);
		setDifficulty(state.aiLevel);

		resize();
		updatePosHash();
		updateHud();
		showStart();
	}

	function showStart() {
		state.menuActive = true;
		startOverlay.style.display = "flex";
		if (layers?.ui) layers.ui.style.pointerEvents = "none";
	}

	function hideStart() {
		state.menuActive = false;
		startOverlay.style.display = "none";
		if (layers?.ui) layers.ui.style.pointerEvents = "auto";
	}

	function setPlayers(vsAI) {
		state.vsAI = vsAI;
		btn1p.classList.toggle("secondary", !vsAI);
		btn2p.classList.toggle("secondary", vsAI);
		btn1p.classList.toggle("active", vsAI);
		btn2p.classList.toggle("active", !vsAI);
	}

	function setDifficulty(level) {
		state.aiLevel = level;
		btnEasy.classList.toggle("active", level === "easy");
		btnMed.classList.toggle("active", level === "medium");
		btnEasy.classList.toggle("secondary", level !== "easy");
		btnMed.classList.toggle("secondary", level !== "medium");
	}

	function startFromOverlay() {
		restart();
		hideStart();
	}

	function restart() {
		state.board = createInitialBoard();
		state.turn = RED;
		state.selected = null;
		state.legal = [];
		state.gameOver = false;
		state.aiThinking = false;
		state.lastMove = null;
		state.moveHistory = [];
		state.posCounts = new Map();
		state.repDraw = false;
		state._undo = [];
		state.info = "Ready";
		state.status = "Turn: Red";
		updatePosHash();
		updateHud();
		renderHistory();
	}

	function undo() {
		const snap = state._undo?.pop?.();
		if (!snap) return;
		state.board = snap.board;
		state.turn = snap.turn;
		state.selected = null;
		state.legal = [];
		state.gameOver = snap.gameOver;
		state.aiThinking = false;
		state.lastMove = snap.lastMove;
		state.moveHistory = snap.moveHistory;
		state.posCounts = new Map(snap.posCounts);
		state.repDraw = snap.repDraw;
		state.info = "Undid move";
		updateHud();
		renderHistory();
	}

	function pushUndo() {
		if (!state._undo) state._undo = [];
		state._undo.push({
			board: cloneBoard(state.board),
			turn: state.turn,
			gameOver: state.gameOver,
			lastMove: state.lastMove,
			moveHistory: [...state.moveHistory],
			posCounts: Array.from(state.posCounts.entries()),
			repDraw: state.repDraw
		});
	}

	function resize() {
		layout.width = window.innerWidth;
		layout.height = window.innerHeight;
		[layers.board, layers.pieces, layers.ui].forEach(c => {
			c.width = layout.width * dpr;
			c.height = layout.height * dpr;
			c.style.width = `${layout.width}px`;
			c.style.height = `${layout.height}px`;
			const ctx = c.getContext("2d");
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		});
		layout.cell = Math.min(layout.width / (COLS + 2), layout.height / (ROWS + 2));
		layout.boardW = layout.cell * (COLS - 1);
		layout.boardH = layout.cell * (ROWS - 1);
		layout.offsetX = (layout.width - layout.boardW) / 2;
		layout.offsetY = (layout.height - layout.boardH) / 2;
	}

	function update() {
		if (state.menuActive) return;
		if (!state.gameOver && state.vsAI && state.turn === BLACK && !state.aiThinking) {
			state.aiThinking = true;
			setTimeout(() => {
				const mv = chooseAIMove(state.board, BLACK, state.aiLevel);
				if (mv) applyMoveAndAdvance(mv.from, mv.to, mv.piece);
				state.aiThinking = false;
			}, 140);
		}
	}

	function drawBoard(ctx) {
		ctx.clearRect(0, 0, layout.width, layout.height);
		ctx.fillStyle = "#0d0f14";
		ctx.fillRect(0, 0, layout.width, layout.height);

		ctx.strokeStyle = "#d4b483";
		ctx.lineWidth = 2;
		for (let y = 0; y < ROWS; y++) {
			const yy = layout.offsetY + y * layout.cell;
			ctx.beginPath();
			ctx.moveTo(layout.offsetX, yy);
			ctx.lineTo(layout.offsetX + (COLS - 1) * layout.cell, yy);
			ctx.stroke();
		}

		for (let x = 0; x < COLS; x++) {
			const xx = layout.offsetX + x * layout.cell;
			ctx.beginPath();
			ctx.moveTo(xx, layout.offsetY);
			ctx.lineTo(xx, layout.offsetY + 4 * layout.cell);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(xx, layout.offsetY + 5 * layout.cell);
			ctx.lineTo(xx, layout.offsetY + 9 * layout.cell);
			ctx.stroke();
		}

		ctx.fillStyle = "rgba(0,0,0,0.28)";
		ctx.font = `${Math.floor(layout.cell * 0.7)}px serif`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("楚河", layout.offsetX + 2 * layout.cell, layout.offsetY + 4.5 * layout.cell);
		ctx.fillText("漢界", layout.offsetX + 6 * layout.cell, layout.offsetY + 4.5 * layout.cell);

		ctx.strokeStyle = "#d4b483";
		ctx.lineWidth = 2;
		drawPalace(ctx, 3, 0, 5, 2);
		drawPalace(ctx, 3, 7, 5, 9);

		if (state.lastMove) {
			ctx.fillStyle = "rgba(56,189,248,0.18)";
			for (const pos of [state.lastMove.from, state.lastMove.to]) {
				const cx = layout.offsetX + pos.x * layout.cell;
				const cy = layout.offsetY + pos.y * layout.cell;
				ctx.fillRect(cx - layout.cell/2 + 2, cy - layout.cell/2 + 2, layout.cell - 4, layout.cell - 4);
			}
		}
	}

	function drawPalace(ctx, x1, y1, x2, y2) {
		const ax = layout.offsetX + x1 * layout.cell;
		const ay = layout.offsetY + y1 * layout.cell;
		const bx = layout.offsetX + x2 * layout.cell;
		const by = layout.offsetY + y2 * layout.cell;
		ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
		ctx.beginPath(); ctx.moveTo(bx, ay); ctx.lineTo(ax, by); ctx.stroke();
	}

	function drawPieces(ctx) {
		ctx.clearRect(0, 0, layout.width, layout.height);
		ctx.textAlign = "center"; ctx.textBaseline = "middle";
		for (let y = 0; y < ROWS; y++) {
			for (let x = 0; x < COLS; x++) {
				const p = state.board[y][x];
				if (!p) continue;
				const cx = layout.offsetX + x * layout.cell;
				const cy = layout.offsetY + y * layout.cell;
				const r = layout.cell * 0.38;
				ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
				ctx.fillStyle = "#f5f5f5"; ctx.fill();
				ctx.strokeStyle = "#333"; ctx.lineWidth = 2; ctx.stroke();
				ctx.font = `${Math.floor(r * 1.08)}px serif`;
				ctx.fillStyle = p.color === RED ? "#d1495b" : "#0f172a";
				ctx.fillText(pieceChar(p), cx, cy + 1);
			}
		}
	}

	function drawUI(ctx) {
		ctx.clearRect(0, 0, layout.width, layout.height);
		if (state.selected) {
			const { x, y } = state.selected;
			const cx = layout.offsetX + x * layout.cell;
			const cy = layout.offsetY + y * layout.cell;
			ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 3;
			ctx.strokeRect(cx - layout.cell/2 + 3, cy - layout.cell/2 + 3, layout.cell - 6, layout.cell - 6);
		}
		for (const mv of state.legal) {
			const cx = layout.offsetX + mv.x * layout.cell;
			const cy = layout.offsetY + mv.y * layout.cell;
			ctx.fillStyle = "rgba(99,102,241,0.6)";
			ctx.beginPath(); ctx.arc(cx, cy, layout.cell * 0.12, 0, Math.PI * 2); ctx.fill();
		}
		const redCheck = isInCheck(state.board, RED);
		const blackCheck = isInCheck(state.board, BLACK);
		ctx.strokeStyle = "#e11d48"; ctx.lineWidth = 3;
		if (redCheck) outlineCell(ctx, findKing(RED));
		if (blackCheck) outlineCell(ctx, findKing(BLACK));

		if (state.gameOver) {
			ctx.fillStyle = "rgba(0,0,0,0.7)";
			ctx.fillRect(16, layout.height - 90, 320, 70);
			ctx.fillStyle = "#fff";
			ctx.font = "16px system-ui, sans-serif";
			ctx.fillText(state.status, 26, layout.height - 60);
			ctx.fillText(state.info, 26, layout.height - 38);
		}
	}

	function outlineCell(ctx, pos) {
		if (!pos) return;
		const cx = layout.offsetX + pos.x * layout.cell;
		const cy = layout.offsetY + pos.y * layout.cell;
		ctx.strokeRect(cx - layout.cell/2 + 2, cy - layout.cell/2 + 2, layout.cell - 4, layout.cell - 4);
	}

	function findKing(color) {
		for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
			const p = state.board[y][x]; if (p && p.color === color && p.type === 'G') return { x, y };
		}
		return null;
	}

	function handleInput(type, event) {
		if (state.menuActive) return;
		if (type === "mouseDown") handlePointer(event);
		if (type === "keyDown") handleKey(event);
	}

	function handlePointer(e) {
		if (e.button !== 0) return;
		if (state.gameOver) return;
		if (state.vsAI && state.turn !== RED) return; // human is red vs AI
		const x = Math.round((e.offsetX - layout.offsetX) / layout.cell);
		const y = Math.round((e.offsetY - layout.offsetY) / layout.cell);
		if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return;

		const clicked = state.board[y][x];
		if (clicked && clicked.color === state.turn) {
			state.selected = { x, y };
			state.legal = legalMovesFrom(state.board, x, y, state.turn);
			return;
		}

		if (state.selected) {
			const mv = state.legal.find(m => m.x === x && m.y === y);
			if (mv) {
				applyMoveAndAdvance(state.selected, mv, state.board[state.selected.y][state.selected.x]);
				state.selected = null; state.legal = [];
				return;
			}
		}

		state.selected = null; state.legal = [];
	}

	function handleKey(e) {
		const k = e.key.toLowerCase();
		if (k === 'r') restart();
		if (k === 'u') undo();
		if (k === 'h') toggleHistory(true);
		if (k === 'escape') toggleHistory(false);
	}

	function applyMoveAndAdvance(from, to, piece) {
		pushUndo();
		const target = state.board[to.y][to.x];
		applyMove(state.board, from, to);
		const capture = !!target;
		state.lastMove = { from, to };
		const text = formatHistory(state.turn, from, to, piece, capture);
		state.moveHistory.push(text);
		renderHistory();

		state.turn = state.turn === RED ? BLACK : RED;
		checkGameEnd();
		updatePosHash();
		updateHud();
	}

	function formatHistory(color, from, to, piece, capture) {
		const side = color === RED ? 'r' : 'b';
		return `${side}: ${piece.type} ${fileLetter(from.x)}${rankNumber(from.y)}${capture ? 'x' : '-'}${fileLetter(to.x)}${rankNumber(to.y)}`;
	}

	function renderHistory() {
		if (!moveList) return;
		moveList.innerHTML = "";
		state.moveHistory.forEach((m, idx) => {
			const div = document.createElement("div");
			div.className = "move-line";
			div.textContent = `${idx + 1}. ${m}`;
			moveList.appendChild(div);
		});
	}

	function toggleHistory(show) {
		const panel = document.getElementById("history");
		if (!panel) return;
		panel.classList.toggle("show", show);
	}

	function updatePosHash() {
		const key = hashPosition(state.board, state.turn);
		const c = (state.posCounts.get(key) || 0) + 1;
		state.posCounts.set(key, c);
		if (c >= 3 && !state.gameOver) {
			state.gameOver = true;
			state.repDraw = true;
			state.status = "Draw";
			state.info = "Threefold repetition";
		}
	}

	function checkGameEnd() {
		if (state.gameOver) return;
		const mover = state.turn;
		if (hasAnyLegalMove(state.board, mover)) return;
		const inChk = isInCheck(state.board, mover);
		state.gameOver = true;
		if (inChk) {
			state.status = mover === RED ? "Black wins" : "Red wins";
			state.info = "Checkmate";
		} else {
			state.status = "Draw";
			state.info = "Stalemate";
		}
	}

	function updateHud() {
		let statusText = `Turn: ${state.turn === RED ? 'Red' : 'Black'}`;
		if (state.vsAI) statusText += state.turn === RED ? " (You)" : " (AI)";
		state.status = statusText;
		state.info = state.gameOver ? state.info : (isInCheck(state.board, state.turn) ? "Check" : state.info || "");
		if (turnEl) turnEl.textContent = statusText;
		if (aiEl) aiEl.textContent = state.vsAI ? `AI: ${state.aiLevel}` : "AI: Off";
		if (msgEl) msgEl.textContent = state.gameOver ? state.info : (state.info || "");
		if (lastEl) {
			if (state.lastMove) {
				const { from, to } = state.lastMove;
				lastEl.textContent = `Last: ${fileLetter(from.x)}${rankNumber(from.y)}->${fileLetter(to.x)}${rankNumber(to.y)}`;
			} else lastEl.textContent = "Last: --";
		}
	}

	function pieceChar(p) {
		if (p.color === RED) {
			if (p.type === 'G') return '帥';
			if (p.type === 'A') return '仕';
			if (p.type === 'E') return '相';
			if (p.type === 'H') return '傌';
			if (p.type === 'R') return '俥';
			if (p.type === 'C') return '炮';
			if (p.type === 'S') return '兵';
		} else {
			if (p.type === 'G') return '將';
			if (p.type === 'A') return '士';
			if (p.type === 'E') return '象';
			if (p.type === 'H') return '馬';
			if (p.type === 'R') return '車';
			if (p.type === 'C') return '砲';
			if (p.type === 'S') return '卒';
		}
		return '?';
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
