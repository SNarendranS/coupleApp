import { Game, Couple, Activity, User } from '../models';
import { BingoConfig } from '@couple/shared';

export class GameService {
  // -------------------------------------------------------------
  // XO / TIC-TAC-TOE ENGINE
  // -------------------------------------------------------------
  private static readonly XO_WINNING_LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  static async getActiveGame(coupleId: string, type: 'xo' | 'bingo') {
    // 1. Check for active or setup game
    const activeGame = await Game.findOne({
      coupleId,
      type,
      status: { $in: ['in_progress', 'setup', 'waiting'] },
    });

    if (activeGame) {
      // If Bingo timed setup has expired, auto-fill and advance to in_progress
      if (activeGame.type === 'bingo' && activeGame.status === 'setup') {
        const config = activeGame.config;
        if (config?.fillMode === 'timed' && config?.setupStartedAt && config?.timeLimitSeconds) {
          const startTime = new Date(config.setupStartedAt).getTime();
          const now = Date.now();
          if (now - startTime >= config.timeLimitSeconds * 1000) {
            await this.finalizeBingoSetup(activeGame);
          }
        }
      }
      return activeGame;
    }

    // 2. If no active game, return the most recent finished game for post-game review
    return Game.findOne({
      coupleId,
      type,
      status: { $in: ['finished', 'draw'] },
    }).sort({ createdAt: -1 });
  }

  static async getGameHistory(coupleId: string, type?: 'xo' | 'bingo') {
    const filter: any = { coupleId, status: { $in: ['finished', 'draw'] } };
    if (type) filter.type = type;

    return Game.find(filter)
      .populate('winner', 'username displayName')
      .sort({ finishedAt: -1 })
      .limit(20);
  }

  static async startXOGame(coupleId: string, createdBy: string) {
    // End any active game
    await Game.updateMany(
      { coupleId, type: 'xo', status: { $in: ['in_progress', 'setup'] } },
      { status: 'cancelled', finishedAt: new Date() }
    );

    const couple = await Couple.findById(coupleId);
    if (!couple || couple.memberIds.length !== 2) {
      throw new Error('Couple members must be exactly 2');
    }

    const [userA, userB] = couple.memberIds.map((id) => id.toString());
    const playerX = createdBy === userA ? userA : userB;
    const playerO = playerX === userA ? userB : userA;

    const game = await Game.create({
      coupleId,
      type: 'xo',
      status: 'in_progress',
      createdBy,
      state: {
        board: Array(9).fill(null),
        playerX,
        playerO,
        currentTurn: playerX, // Player X goes first
        winningLine: null,
        winner: null,
        movesCount: 0,
      },
    });

    return game;
  }

  static async handleXOMove(gameId: string, userId: string, cellIndex: number) {
    const game = await Game.findById(gameId);
    if (!game) {
      const err: any = new Error('Game not found');
      err.statusCode = 404;
      throw err;
    }

    if (game.status !== 'in_progress') {
      const err: any = new Error('Game is not active');
      err.statusCode = 400;
      throw err;
    }

    const state = game.state;
    if (state.currentTurn !== userId) {
      const err: any = new Error('It is not your turn');
      err.statusCode = 400;
      err.code = 'NOT_YOUR_TURN';
      throw err;
    }

    if (cellIndex < 0 || cellIndex > 8 || state.board[cellIndex] !== null) {
      const err: any = new Error('Invalid cell move');
      err.statusCode = 400;
      throw err;
    }

    const isPlayerX = userId === state.playerX;
    const symbol = isPlayerX ? 'X' : 'O';
    state.board[cellIndex] = symbol;
    state.movesCount = (state.movesCount || 0) + 1;

    // Check for win
    let winningLine: number[] | null = null;
    for (const line of this.XO_WINNING_LINES) {
      const [a, b, c] = line;
      if (
        state.board[a] &&
        state.board[a] === state.board[b] &&
        state.board[a] === state.board[c]
      ) {
        winningLine = line;
        break;
      }
    }

    if (winningLine) {
      game.status = 'finished';
      game.winner = userId as any;
      game.finishedAt = new Date();
      state.winningLine = winningLine;
      state.winner = userId;

      const winnerUser = await User.findById(userId);
      await Activity.create({
        coupleId: game.coupleId,
        userId,
        action: 'game_won',
        details: `${winnerUser?.displayName || 'Player'} won the XO match in ${state.movesCount} moves!`,
      });
    } else if (state.board.every((cell: string | null) => cell !== null)) {
      // Draw
      game.status = 'draw';
      game.finishedAt = new Date();
      state.winningLine = null;
      state.winner = null;

      await Activity.create({
        coupleId: game.coupleId,
        userId,
        action: 'game_draw',
        details: `XO match ended in a romantic tie!`,
      });
    } else {
      // Toggle turn
      state.currentTurn = isPlayerX ? state.playerO : state.playerX;
    }

    game.markModified('state');
    await game.save();
    return game;
  }

  static async restartGame(coupleId: string, userId: string, gameId: string) {
    const game = await Game.findOne({ _id: gameId, coupleId });
    if (!game) {
      const err: any = new Error('Game not found');
      err.statusCode = 404;
      throw err;
    }

    // Cancel old game
    game.status = 'cancelled';
    game.finishedAt = new Date();
    await game.save();

    // Start fresh game of the same type
    if (game.type === 'xo') {
      return this.startXOGame(coupleId, userId);
    } else {
      return this.initBingoSetup(coupleId, userId, game.config as any);
    }
  }

  static async endGame(coupleId: string, _userId: string, gameId: string) {
    const game = await Game.findOne({ _id: gameId, coupleId });
    if (!game) {
      const err: any = new Error('Game not found');
      err.statusCode = 404;
      throw err;
    }

    game.status = 'cancelled';
    game.finishedAt = new Date();
    await game.save();
    return game;
  }

  // -------------------------------------------------------------
  // BINGO ENGINE (Authoritative 2-Player Couple Bingo)
  // -------------------------------------------------------------
  private static generateShuffledBoard(): number[][] {
    const nums = Array.from({ length: 25 }, (_, i) => i + 1);
    // Fisher-Yates shuffle
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }

    const board: number[][] = [];
    for (let row = 0; row < 5; row++) {
      board.push(nums.slice(row * 5, row * 5 + 5));
    }
    return board;
  }

  private static createEmptyBoard(): (number | null)[][] {
    return Array.from({ length: 5 }, () => Array(5).fill(null));
  }

  private static fillRemainingCells(board: (number | null)[][]): number[][] {
    const used = new Set<number>();
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const val = board[r]?.[c];
        if (typeof val === 'number' && val >= 1 && val <= 25) {
          used.add(val);
        }
      }
    }

    const unused: number[] = [];
    for (let i = 1; i <= 25; i++) {
      if (!used.has(i)) unused.push(i);
    }

    // Shuffle unused
    for (let i = unused.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unused[i], unused[j]] = [unused[j], unused[i]];
    }

    const result: number[][] = [];
    let unusedIdx = 0;
    for (let r = 0; r < 5; r++) {
      const row: number[] = [];
      for (let c = 0; c < 5; c++) {
        const val = board[r]?.[c];
        if (typeof val === 'number' && val >= 1 && val <= 25) {
          row.push(val);
        } else {
          row.push(unused[unusedIdx++]);
        }
      }
      result.push(row);
    }
    return result;
  }

  private static calculateBingoLines(board: number[][], calledNumbers: Set<number>): number {
    if (!board || board.length !== 5) return 0;
    let completed = 0;

    // Check rows
    for (let r = 0; r < 5; r++) {
      if (board[r] && board[r].every((n) => calledNumbers.has(n))) {
        completed++;
      }
    }

    // Check columns
    for (let c = 0; c < 5; c++) {
      let colComplete = true;
      for (let r = 0; r < 5; r++) {
        if (!calledNumbers.has(board[r][c])) {
          colComplete = false;
          break;
        }
      }
      if (colComplete) completed++;
    }

    // Check main diagonal
    let diag1 = true;
    for (let i = 0; i < 5; i++) {
      if (!calledNumbers.has(board[i][i])) {
        diag1 = false;
        break;
      }
    }
    if (diag1) completed++;

    // Check anti-diagonal
    let diag2 = true;
    for (let i = 0; i < 5; i++) {
      if (!calledNumbers.has(board[i][4 - i])) {
        diag2 = false;
        break;
      }
    }
    if (diag2) completed++;

    return completed;
  }

  static async initBingoSetup(coupleId: string, createdBy: string, config?: BingoConfig) {
    // Cancel any active or setup Bingo games
    await Game.updateMany(
      { coupleId, type: 'bingo', status: { $in: ['in_progress', 'setup'] } },
      { status: 'cancelled', finishedAt: new Date() }
    );

    const couple = await Couple.findById(coupleId);
    if (!couple || couple.memberIds.length !== 2) {
      throw new Error('Couple must have 2 members to play Bingo');
    }

    const [userA, userB] = couple.memberIds.map((id) => id.toString());
    const fillMode = config?.fillMode || 'automatic';
    const timeLimitSeconds = config?.timeLimitSeconds || 30;

    const gameConfig: BingoConfig = {
      fillMode,
      timeLimitSeconds,
      setupStartedAt: new Date().toISOString(),
    };

    if (fillMode === 'automatic') {
      // Instant board generation & direct transition to in_progress
      const playerBoards: Record<string, number[][]> = {
        [userA]: this.generateShuffledBoard(),
        [userB]: this.generateShuffledBoard(),
      };

      const game = await Game.create({
        coupleId,
        type: 'bingo',
        status: 'in_progress',
        createdBy,
        config: gameConfig,
        state: {
          players: [userA, userB],
          playerBoards,
          calledNumbers: [],
          playerLinesCompleted: {
            [userA]: 0,
            [userB]: 0,
          },
          currentTurn: createdBy,
          winner: null,
          readyPlayers: [userA, userB],
        },
      });

      return game;
    }

    // Manual or Timed Manual setup
    const playerBoards: Record<string, (number | null)[][]> = {
      [userA]: this.createEmptyBoard(),
      [userB]: this.createEmptyBoard(),
    };

    const game = await Game.create({
      coupleId,
      type: 'bingo',
      status: 'setup',
      createdBy,
      config: gameConfig,
      state: {
        players: [userA, userB],
        playerBoards,
        calledNumbers: [],
        playerLinesCompleted: {
          [userA]: 0,
          [userB]: 0,
        },
        currentTurn: createdBy,
        winner: null,
        readyPlayers: [],
      },
    });

    return game;
  }

  static async submitBingoBoard(gameId: string, userId: string, board: number[][]) {
    const game = await Game.findById(gameId);
    if (!game) {
      const err: any = new Error('Game not found');
      err.statusCode = 404;
      throw err;
    }

    if (game.status !== 'setup') {
      const err: any = new Error('Game setup phase has already ended');
      err.statusCode = 400;
      throw err;
    }

    // Validate 5x5 matrix
    if (!Array.isArray(board) || board.length !== 5 || board.some((r) => !Array.isArray(r) || r.length !== 5)) {
      const err: any = new Error('Board must be a 5x5 grid');
      err.statusCode = 400;
      throw err;
    }

    // Validate unique numbers 1-25
    const flat = board.flat();
    const unique = new Set(flat);
    if (unique.size !== 25 || flat.some((n) => typeof n !== 'number' || n < 1 || n > 25)) {
      const err: any = new Error('Board must contain every number from 1 to 25 exactly once');
      err.statusCode = 400;
      throw err;
    }

    const state = game.state;
    state.playerBoards[userId] = board;

    const readyPlayers: string[] = state.readyPlayers || [];
    if (!readyPlayers.includes(userId)) {
      readyPlayers.push(userId);
      state.readyPlayers = readyPlayers;
    }

    // If both players have submitted boards, start active gameplay!
    const players: string[] = state.players;
    if (players.every((p) => readyPlayers.includes(p))) {
      game.status = 'in_progress';
    }

    game.markModified('state');
    await game.save();
    return game;
  }

  static async autoFillBingoBoard(gameId: string, userId: string) {
    const game = await Game.findById(gameId);
    if (!game) {
      const err: any = new Error('Game not found');
      err.statusCode = 404;
      throw err;
    }

    if (game.status !== 'setup') {
      return game;
    }

    const state = game.state;
    const currentBoard = state.playerBoards[userId] || this.createEmptyBoard();
    state.playerBoards[userId] = this.fillRemainingCells(currentBoard);

    const readyPlayers: string[] = state.readyPlayers || [];
    if (!readyPlayers.includes(userId)) {
      readyPlayers.push(userId);
      state.readyPlayers = readyPlayers;
    }

    const players: string[] = state.players;
    if (players.every((p) => readyPlayers.includes(p))) {
      game.status = 'in_progress';
    }

    game.markModified('state');
    await game.save();
    return game;
  }

  private static async finalizeBingoSetup(game: any) {
    const state = game.state;
    const players: string[] = state.players;

    for (const p of players) {
      const board = state.playerBoards[p] || this.createEmptyBoard();
      state.playerBoards[p] = this.fillRemainingCells(board);
    }

    state.readyPlayers = [...players];
    game.status = 'in_progress';
    game.markModified('state');
    await game.save();
    return game;
  }

  static async handleBingoCall(gameId: string, userId: string, calledNumber: number) {
    const game = await Game.findById(gameId);
    if (!game) {
      const err: any = new Error('Game not found');
      err.statusCode = 404;
      throw err;
    }

    // If still in setup but timer expired, auto-finalize
    if (game.status === 'setup') {
      await this.finalizeBingoSetup(game);
    }

    if (game.status !== 'in_progress') {
      const err: any = new Error('Game is not in progress');
      err.statusCode = 400;
      throw err;
    }

    const state = game.state;
    if (state.currentTurn !== userId) {
      const err: any = new Error('It is not your turn to call a number');
      err.statusCode = 400;
      err.code = 'NOT_YOUR_TURN';
      throw err;
    }

    if (calledNumber < 1 || calledNumber > 25) {
      const err: any = new Error('Bingo numbers must be between 1 and 25');
      err.statusCode = 400;
      throw err;
    }

    if (state.calledNumbers.includes(calledNumber)) {
      const err: any = new Error('This number has already been called');
      err.statusCode = 400;
      throw err;
    }

    // Add to called numbers
    state.calledNumbers.push(calledNumber);
    const calledSet = new Set<number>(state.calledNumbers);

    // Recompute completed lines for all players
    const players: string[] = state.players;
    let winners: string[] = [];

    for (const pId of players) {
      const board = state.playerBoards[pId];
      const lines = this.calculateBingoLines(board, calledSet);
      state.playerLinesCompleted[pId] = lines;

      if (lines >= 5) {
        winners.push(pId);
      }
    }

    if (winners.length > 0) {
      game.status = 'finished';
      game.finishedAt = new Date();

      if (winners.includes(userId)) {
        game.winner = userId as any;
        state.winner = userId;
      } else {
        game.winner = winners[0] as any;
        state.winner = winners[0];
      }

      const winnerUser = await User.findById(state.winner);
      await Activity.create({
        coupleId: game.coupleId,
        userId: state.winner,
        action: 'bingo_won',
        details: `${winnerUser?.displayName || 'Player'} shouted B-I-N-G-O!`,
      });
    } else {
      // Next turn
      const nextPlayer = players.find((p) => p !== userId) || userId;
      state.currentTurn = nextPlayer;
    }

    game.markModified('state');
    await game.save();
    return game;
  }
}
