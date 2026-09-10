import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../auth';
import { GameService } from '../../services/game.service';
import { SOCKET_EVENTS, gameMoveSchema, bingoSubmitBoardSchema, gameRestartSchema } from '@couple/shared';

export function registerGameHandlers(io: Server, socket: AuthenticatedSocket) {
  const coupleId = socket.data.coupleId;
  const userId = socket.data.userId;

  if (!coupleId) return;

  const room = `couple:${coupleId}`;

  // Start / Create game
  socket.on(SOCKET_EVENTS.GAME_CREATE, async (payload: { type: 'xo' | 'bingo'; config?: any }, ack?: Function) => {
    try {
      let game;
      if (payload.type === 'bingo') {
        game = await GameService.initBingoSetup(coupleId, userId, payload.config);
      } else {
        game = await GameService.startXOGame(coupleId, userId);
      }

      io.to(room).emit(SOCKET_EVENTS.GAME_STATE, game);
      if (ack) ack({ success: true, game });
    } catch (err: any) {
      if (ack) ack({ success: false, error: err.message });
    }
  });

  // Bingo Setup Request
  socket.on(SOCKET_EVENTS.GAME_SETUP, async (payload: { config?: any }, ack?: Function) => {
    try {
      const game = await GameService.initBingoSetup(coupleId, userId, payload?.config);
      io.to(room).emit(SOCKET_EVENTS.GAME_STATE, game);
      if (ack) ack({ success: true, game });
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
      io.to(room).emit(SOCKET_EVENTS.GAME_STATE, game);
      if (ack) ack({ success: true, game });
    } catch (err: any) {
      if (ack) ack({ success: false, error: err.message });
    }
  });

  // Bingo Auto-Fill Board
  socket.on(SOCKET_EVENTS.GAME_AUTOFILL, async (payload: { gameId: string }, ack?: Function) => {
    try {
      const game = await GameService.autoFillBingoBoard(payload.gameId, userId);
      io.to(room).emit(SOCKET_EVENTS.GAME_STATE, game);
      if (ack) ack({ success: true, game });
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
      io.to(room).emit(SOCKET_EVENTS.GAME_STATE, game);
      if (ack) ack({ success: true, game });
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
      io.to(room).emit(SOCKET_EVENTS.GAME_STATE, game);
      if (ack) ack({ success: true, game });
    } catch (err: any) {
      if (ack) ack({ success: false, error: err.message });
    }
  });

  // Game Move (XO or Bingo Call)
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
      }

      if (updatedGame) {
        io.to(room).emit(SOCKET_EVENTS.GAME_STATE, updatedGame);

        if (updatedGame.status === 'finished' || updatedGame.status === 'draw') {
          io.to(room).emit(SOCKET_EVENTS.GAME_FINISHED, {
            gameId: updatedGame._id,
            winner: updatedGame.winner,
            status: updatedGame.status,
          });
        }
      }

      if (ack) ack({ success: true, game: updatedGame });
    } catch (err: any) {
      if (ack) ack({ success: false, error: err.message });
    }
  });
}
