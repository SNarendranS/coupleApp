import { Request, Response, NextFunction } from 'express';
import { GameService } from '../services/game.service';

export class GameController {
  static async getActiveGame(req: Request, res: Response, next: NextFunction) {
    try {
      const type = (req.query.type as 'xo' | 'bingo') || 'xo';
      const game = await GameService.getActiveGame(req.coupleId!, type);
      res.status(200).json({
        success: true,
        data: game,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const type = req.query.type as 'xo' | 'bingo' | undefined;
      const history = await GameService.getGameHistory(req.coupleId!, type);
      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }

  static async startGame(req: Request, res: Response, next: NextFunction) {
    try {
      const { type } = req.body;
      let game;
      if (type === 'bingo') {
        game = await GameService.startBingoGame(req.coupleId!, req.userId!);
      } else {
        game = await GameService.startXOGame(req.coupleId!, req.userId!);
      }

      res.status(201).json({
        success: true,
        data: game,
      });
    } catch (error) {
      next(error);
    }
  }

  static async makeMove(req: Request, res: Response, next: NextFunction) {
    try {
      const { gameId, move } = req.body;
      let updatedGame;

      if (move.cellIndex !== undefined) {
        updatedGame = await GameService.handleXOMove(gameId, req.userId!, move.cellIndex);
      } else if (move.calledNumber !== undefined) {
        updatedGame = await GameService.handleBingoCall(gameId, req.userId!, move.calledNumber);
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_MOVE', message: 'Move must specify cellIndex or calledNumber' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updatedGame,
      });
    } catch (error) {
      next(error);
    }
  }
}
