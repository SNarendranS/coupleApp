import { Game, Couple, Activity, Notification, User } from '../models';

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
    return Game.findOne({ coupleId, type, status: 'in_progress' });
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
    // Check if there is an active game already; if so, finish or replace it
    await Game.updateMany(
      { coupleId, type: 'xo', status: 'in_progress' },
      { status: 'finished', finishedAt: new Date() }
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
      const err: any = new Error('Game has already finished');
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
        details: `${winnerUser?.displayName || 'Player'} won the XO match!`,
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

  private static calculateBingoLines(board: number[][], calledNumbers: Set<number>): number {
    let completed = 0;

    // Check rows
    for (let r = 0; r < 5; r++) {
      if (board[r].every((n) => calledNumbers.has(n))) {
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

  static async startBingoGame(coupleId: string, createdBy: string) {
    await Game.updateMany(
      { coupleId, type: 'bingo', status: 'in_progress' },
      { status: 'finished', finishedAt: new Date() }
    );

    const couple = await Couple.findById(coupleId);
    if (!couple || couple.memberIds.length !== 2) {
      throw new Error('Couple must have 2 members to play Bingo');
    }

    const [userA, userB] = couple.memberIds.map((id) => id.toString());

    const playerBoards: Record<string, number[][]> = {
      [userA]: this.generateShuffledBoard(),
      [userB]: this.generateShuffledBoard(),
    };

    const game = await Game.create({
      coupleId,
      type: 'bingo',
      status: 'in_progress',
      createdBy,
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
      },
    });

    return game;
  }

  static async handleBingoCall(gameId: string, userId: string, calledNumber: number) {
    const game = await Game.findById(gameId);
    if (!game) {
      const err: any = new Error('Game not found');
      err.statusCode = 404;
      throw err;
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
