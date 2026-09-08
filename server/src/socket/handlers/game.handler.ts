import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../auth';
import { GameService } from '../../services/game.service';
import { SOCKET_EVENTS, gameMoveSchema } from '@couple/shared';

export function registerGameHandlers(io: Server, socket: AuthenticatedSocket) {
  const coupleId = socket.data.coupleId;
  const userId = socket.data.userId;

  if (!coupleId) return;

  // Restart / Start game
  socket.on(SOCKET_EVENTS.GAME_CREATE, async (payload: { type: 'xo' | 'bingo' }, ack?: Function) => {
    try {
      let game;
      if (payload.type === 'bingo') {
        game = await GameService.startBingoGame(coupleId, userId);
      } else {
        game = await GameService.startXOGame(coupleId, userId);
      }

      io.to(`couple:${coupleId}`).emit(SOCKET_EVENTS.GAME_STATE, game);
      if (ack) ack({ success: true, game });
    } catch (err: any) {
      if (ack) ack({ success: false, error: err.message });
    }
  });

  // Game Move
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
        io.to(`couple:${coupleId}`).emit(SOCKET_EVENTS.GAME_STATE, updatedGame);

        if (updatedGame.status === 'finished' || updatedGame.status === 'draw') {
          io.to(`couple:${coupleId}`).emit(SOCKET_EVENTS.GAME_FINISHED, {
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
