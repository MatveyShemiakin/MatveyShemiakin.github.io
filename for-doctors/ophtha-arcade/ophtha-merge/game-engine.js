export const BOARD_SIZE = 4;
export const GAME_VERSION = 2;
export const MODES = new Set(['classic', 'sprint']);

export function isPowerOfTwo(value) {
  return Number.isSafeInteger(value) && value >= 2 && Number.isInteger(Math.log2(value));
}

export function emptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
}

export function cloneBoard(board) {
  return board.map((row) => row.slice());
}

export function maxTile(board) {
  return Math.max(0, ...board.flat());
}

export function slideLine(input) {
  const compact = input.filter(Boolean);
  const out = [];
  const merges = [];
  let gained = 0;

  for (let i = 0; i < compact.length; i += 1) {
    if (compact[i] === compact[i + 1]) {
      const merged = compact[i] * 2;
      out.push(merged);
      merges.push(merged);
      gained += merged;
      i += 1;
    } else {
      out.push(compact[i]);
    }
  }

  while (out.length < BOARD_SIZE) out.push(0);
  return { line: out, gained, merges };
}

function transpose(board) {
  return board[0].map((_, column) => board.map((row) => row[column]));
}

function reverseRows(board) {
  return board.map((row) => row.slice().reverse());
}

function sameBoard(a, b) {
  return a.every((row, r) => row.every((value, c) => value === b[r][c]));
}

export function moveBoard(board, direction) {
  if (!['left', 'right', 'up', 'down'].includes(direction)) {
    throw new TypeError(`Unknown direction: ${direction}`);
  }

  let working = cloneBoard(board);
  let reverse = false;
  let vertical = false;

  if (direction === 'up' || direction === 'down') {
    working = transpose(working);
    vertical = true;
  }
  if (direction === 'right' || direction === 'down') {
    working = reverseRows(working);
    reverse = true;
  }

  let gained = 0;
  const merges = [];
  working = working.map((line) => {
    const result = slideLine(line);
    gained += result.gained;
    merges.push(...result.merges);
    return result.line;
  });

  if (reverse) working = reverseRows(working);
  if (vertical) working = transpose(working);

  return {
    board: working,
    moved: !sameBoard(board, working),
    gained,
    merges
  };
}

export function canMove(board) {
  if (board.flat().some((value) => value === 0)) return true;
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const value = board[row][col];
      if (row + 1 < BOARD_SIZE && board[row + 1][col] === value) return true;
      if (col + 1 < BOARD_SIZE && board[row][col + 1] === value) return true;
    }
  }
  return false;
}

export function addRandomTile(board, random = Math.random) {
  const next = cloneBoard(board);
  const empty = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (next[row][col] === 0) empty.push([row, col]);
    }
  }
  if (!empty.length) return next;

  const index = Math.min(empty.length - 1, Math.floor(random() * empty.length));
  const [row, col] = empty[index];
  next[row][col] = random() < 0.9 ? 2 : 4;
  return next;
}

export function createInitialBoard(random = Math.random) {
  let board = emptyBoard();
  board = addRandomTile(board, random);
  board = addRandomTile(board, random);
  return board;
}

function validBoard(board) {
  return Array.isArray(board) && board.length === BOARD_SIZE && board.every((row) => (
    Array.isArray(row) && row.length === BOARD_SIZE && row.every((value) => value === 0 || isPowerOfTwo(value))
  ));
}

export function serializeGame(state) {
  return JSON.stringify(state);
}

export function hydrateGame(raw) {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!value || value.version !== GAME_VERSION || !validBoard(value.board)) return null;
    if (!Number.isSafeInteger(value.score) || value.score < 0) return null;
    if (!Number.isSafeInteger(value.bestScore) || value.bestScore < 0) return null;
    if (!Number.isSafeInteger(value.maxTile) || (value.maxTile !== 0 && !isPowerOfTwo(value.maxTile))) return null;
    if (!MODES.has(value.mode)) return null;
    if (!Number.isSafeInteger(value.moves) || value.moves < 0) return null;
    if (typeof value.undoUsed !== 'boolean') return null;
    if (!Number.isFinite(value.startedAt)) return null;
    if (!Array.isArray(value.milestones) || !value.milestones.every((v) => isPowerOfTwo(v))) return null;
    return value;
  } catch {
    return null;
  }
}
