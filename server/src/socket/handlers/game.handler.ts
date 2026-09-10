import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../auth';
import { GameService } from '../../services/game.service';
import {
  SOCKET_EVENTS,
  gameMoveSchema,
  bingoSubmitBoardSchema,
  gameRestartSchema,
  battleshipPlaceShipsSchema,
  battleshipFireSchema,
  checkersMoveSchema,
} from '@couple/shared';

export function registerGameHandlers(io: Server, socket: AuthenticatedSocket) {
  const coupleId = socket.data.coupleId;
  const userId = socket.data.userId;

  if (!coupleId) return;

  const room = `couple:${coupleId}`;

  // Helper to broadcast game state with strict privacy redaction for Battleship
  function broadcastGameState(game: any) {
    if (!game) return;
    if (game.type === 'battleship') {
      const isFinished = game.status === 'finished' || game.status === 'draw' || game.status === 'cancelled';
      if (isFinished) {
        io.to(room).emit(SOCKET_EVENTS.GAME_STATE, GameService.sanitizeGameForUser(game, userId));
      } else {
        const players = game.state?.publicState?.players || [];
        for (const p of players) {
          const sanitized = GameService.sanitizeGameForUser(game, p);
          io.to(`user:${p}`).emit(SOCKET_EVENTS.GAME_STATE, sanitized);
        }
      }
    } else {
      io.to(room).emit(SOCKET_EVENTS.GAME_STATE, game);
    }
  }

  // Start / Create game
  socket.on(
    SOCKET_EVENTS.GAME_CREATE,
    async (payload: { type: 'xo' | 'bingo' | 'battleship' | 'checkers'; config?: any }, ack?: Function) => {
      try {
        let game;
        if (payload.type === 'bingo') {
          game = await GameService.initBingoSetup(coupleId, userId, payload.config);
        } else if (payload.type === 'battleship') {
          game = await GameService.startBattleshipGame(coupleId, userId, payload.config);
        } else if (payload.type === 'checkers') {
          game = await GameService.startCheckersGame(coupleId, userId, payload.config);
        } else {
          game = await GameService.startXOGame(coupleId, userId);
        }

        broadcastGameState(game);
        if (ack) ack({ success: true, game: GameService.sanitizeGameForUser(game, userId) });
      } catch (err: any) {
        if (ack) ack({ success: false, error: err.message });
      }
    }
  );

  // Bingo Setup Request
  socket.on(SOCKET_EVENTS.GAME_SETUP, async (payload: { config?: any }, ack?: Function) => {
    try {
      const game = await GameService.initBingoSetup(coupleId, userId, payload?.config);
      broadcastGameState(game);
      if (ack) ack({ success: true, game: GameService.sanitizeGameForUser(game, userId) });
    } catch (err: any) {
      if (ack) ack({ success: false, error: err.message });
    }
  });

  // Bingo Submit Board
  socket.on(SOCKET_EVENTS.GAME_SUBMIT_BOARD, async (payload: any, ack?: Function) => {
    try {
      const parsed = bingoSubmitBoardSchema.safeParse(payload);
      if (!parsed.success) {
        if (ack) ack({ success: false, error: 'Invalid board payload' });
        return;
      }

      const game = await GameService.submitBingoBoard(parsed.data.gameId, userId, parsed.data.board);
      broadcastGameState(game);
      if (ack) ack({ success: true, game: GameService.sanitizeGameForUser(game, userId) });
    } catch (err: any) {
      if (ack) ack({ success: false, error: err.message });
    }
  });

  // Bingo Auto-Fill Board
  socket.on(SOCKET_EVENTS.GAME_AUTOFILL, async (payload: { gameId: string }, ack?: Function) => {
    try {
      const game = await GameService.autoFillBingoBoard(payload.gameId, userId);
      broadcastGameState(game);
      if (ack) ack({ success: true, game: GameService.sanitizeGameForUser(game, userId) });
    } catch (err: any) {
      if (ack) ack({ success: false, error: err.message });
    }
  });

  // Battleship Place Ships
  socket.on(SOCKET_EVENTS.GAME_BATTLESHIP_PLACE, async (payload: any, ack?: Function) => {
    try {
      const parsed = battleshipPlaceShipsSchema.safeParse(payload);
      if (!parsed.success) {
        if (ack) ack({ success: false, error: 'Invalid fleet placement payload' });
        return;
      }

      const game = await GameService.placeBattleshipFleet(parsed.data.gameId, userId, parsed.data.fleet as any);
      broadcastGameState(game);
      if (ack) ack({ success: true, game: GameService.sanitizeGameForUser(game, userId) });
    } catch (err: any) {
      if (ack) ack({ success: false, error: err.message });
    }
  });

  // Battleship Randomize Fleet
  socket.on(SOCKET_EVENTS.GAME_BATTLESHIP_RANDOMIZE, async (payload: { gameId: string }, ack?: Function) => {
    try {
      const { game, fleet } = await GameService.randomizeBattleshipFleet(payload.gameId, userId);
      broadcastGameState(game);
      if (ack) ack({ success: true, game: GameService.sanitizeGameForUser(game, userId), fleet });
    } catch (err: any) {
      if (ack) ack({ success: false, error: err.message });
    }
  });

  // Battleship Ready Fleet
  socket.on(SOCKET_EVENTS.GAME_BATTLESHIP_READY, async (payload: { gameId: string }, ack?: Function) => {
    try {
      const game = await GameService.readyBattleshipFleet(payload.gameId, userId);
      broadcastGameState(game);
      if (ack) ack({ success: true, game: GameService.sanitizeGameForUser(game, userId) });
    } catch (err: any) {
      if (ack) ack({ success: false, error: err.message });
    }
  });

  // Battleship Fire
  socket.on(SOCKET_EVENTS.GAME_BATTLESHIP_FIRE, async (payload: any, ack?: Function) => {
    try {
      const parsed = battleshipFireSchema.safeParse(payload);
      if (!parsed.success) {
        if (ack) ack({ success: false, error: 'Invalid fire payload' });
        return;
      }

      const res = await GameService.handleBattleshipFire(parsed.data.gameId, userId, parsed.data.target);
      broadcastGameState(res.game);

      if (res.game.status === 'finished') {
        io.to(room).emit(SOCKET_EVENTS.GAME_FINISHED, {
          gameId: res.game._id,
          winner: res.game.winner,
          status: res.game.status,
        });
      }

      if (ack) ack({ success: true, game: GameService.sanitizeGameForUser(res.game, userId), result: res.shotResult });
    } catch (err: any) {
      if (ack) ack({ success: false, error: err.message });
    }
  });

  // Checkers Move
  socket.on(SOCKET_EVENTS.GAME_CHECKERS_MOVE, async (payload: any, ack?: Function) => {
    try {
      const parsed = checkersMoveSchema.safeParse(payload);
      if (!parsed.success) {
        if (ack) ack({ success: false, error: 'Invalid checkers move payload' });
        return;
      }

      const res = await GameService.handleCheckersMove(parsed.data.gameId, userId, parsed.data.from, parsed.data.to);
      broadcastGameState(res.game);

      if (res.game.status === 'finished') {
        io.to(room).emit(SOCKET_EVENTS.GAME_FINISHED, {
          gameId: res.game._id,
          winner: res.game.winner,
          status: res.game.status,
        });
      }

      if (ack) ack({ success: true, game: res.game, result: res.moveResult });
    } catch (err: any) {
      if (ack) ack({ success: false, error: err.message });
    }
  });

  // Restart Game (Deliberate action with server verification)
  socket.on(SOCKET_EVENTS.GAME_RESTART, async (payload: any, ack?: Function) => {
    try {
      const parsed = gameRestartSchema.safeParse(payload);
      if (!parsed.success) {
        if (ack) ack({ success: false, error: 'Invalid restart payload' });
        return;
      }

      const game = await GameService.restartGame(coupleId, userId, parsed.data.gameId);
      broadcastGameState(game);
      if (ack) ack({ success: true, game: GameService.sanitizeGameForUser(game, userId) });
    } catch (err: any) {
      if (ack) ack({ success: false, error: err.message });
    }
  });

  // End Game
  socket.on(SOCKET_EVENTS.GAME_END, async (payload: any, ack?: Function) => {
    try {
      const parsed = gameRestartSchema.safeParse(payload);
      if (!parsed.success) {
        if (ack) ack({ success: false, error: 'Invalid payload' });
        return;
      }

      const game = await GameService.endGame(coupleId, userId, parsed.data.gameId);
      broadcastGameState(game);
      if (ack) ack({ success: true, game: GameService.sanitizeGameForUser(game, userId) });
    } catch (err: any) {
      if (ack) ack({ success: false, error: err.message });
    }
  });

  // Universal Game Move (XO, Bingo, Battleship, Checkers)
  socket.on(SOCKET_EVENTS.GAME_MOVE, async (payload: any, ack?: Function) => {
    try {
      const parsed = gameMoveSchema.safeParse(payload);
      if (!parsed.success) {
        if (ack) ack({ success: false, error: 'Invalid game move payload' });
        return;
      }

      const { gameId, move } = parsed.data;
      let updatedGame;

      if (move.cellIndex !== undefined) {
        updatedGame = await GameService.handleXOMove(gameId, userId, move.cellIndex);
      } else if (move.calledNumber !== undefined) {
        updatedGame = await GameService.handleBingoCall(gameId, userId, move.calledNumber);
      } else if (move.target !== undefined) {
        const res = await GameService.handleBattleshipFire(gameId, userId, move.target);
        updatedGame = res.game;
      } else if (move.from !== undefined && move.to !== undefined) {
        const res = await GameService.handleCheckersMove(gameId, userId, move.from, move.to);
        updatedGame = res.game;
      }

      if (updatedGame) {
        broadcastGameState(updatedGame);

        if (updatedGame.status === 'finished' || updatedGame.status === 'draw') {
          io.to(room).emit(SOCKET_EVENTS.GAME_FINISHED, {
            gameId: updatedGame._id,
            winner: updatedGame.winner,
            status: updatedGame.status,
          });
        }
      }

      if (ack) ack({ success: true, game: GameService.sanitizeGameForUser(updatedGame, userId) });
    } catch (err: any) {
      if (ack) ack({ success: false, error: err.message });
    }
  });
}
