import { Request, Response, NextFunction } from 'express';
import { GameService } from '../services/game.service';

export class GameController {
  static async getActiveGame(req: Request, res: Response, next: NextFunction) {
    try {
      const type = (req.query.type as 'xo' | 'bingo' | 'battleship' | 'checkers') || 'xo';
      const game = await GameService.getActiveGame(req.coupleId!, type, req.userId!);
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
      const type = req.query.type as 'xo' | 'bingo' | 'battleship' | 'checkers' | undefined;
      const history = await GameService.getGameHistory(req.coupleId!, type, req.userId!);
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
      const { type, config } = req.body;
      let game;
      if (type === 'bingo') {
        game = await GameService.initBingoSetup(req.coupleId!, req.userId!, config);
      } else if (type === 'battleship') {
        game = await GameService.startBattleshipGame(req.coupleId!, req.userId!, config);
      } else if (type === 'checkers') {
        game = await GameService.startCheckersGame(req.coupleId!, req.userId!, config);
      } else {
        game = await GameService.startXOGame(req.coupleId!, req.userId!);
      }

      res.status(201).json({
        success: true,
        data: GameService.sanitizeGameForUser(game, req.userId!),
      });
    } catch (error) {
      next(error);
    }
  }

  static async submitBoard(req: Request, res: Response, next: NextFunction) {
    try {
      const { gameId, board } = req.body;
      const game = await GameService.submitBingoBoard(gameId, req.userId!, board);
      res.status(200).json({
        success: true,
        data: GameService.sanitizeGameForUser(game, req.userId!),
      });
    } catch (error) {
      next(error);
    }
  }

  static async autoFillBoard(req: Request, res: Response, next: NextFunction) {
    try {
      const { gameId } = req.body;
      const game = await GameService.autoFillBingoBoard(gameId, req.userId!);
      res.status(200).json({
        success: true,
        data: GameService.sanitizeGameForUser(game, req.userId!),
      });
    } catch (error) {
      next(error);
    }
  }

  static async placeFleet(req: Request, res: Response, next: NextFunction) {
    try {
      const { gameId, fleet } = req.body;
      const game = await GameService.placeBattleshipFleet(gameId, req.userId!, fleet);
      res.status(200).json({
        success: true,
        data: GameService.sanitizeGameForUser(game, req.userId!),
      });
    } catch (error) {
      next(error);
    }
  }

  static async randomizeFleet(req: Request, res: Response, next: NextFunction) {
    try {
      const { gameId } = req.body;
      const { game, fleet } = await GameService.randomizeBattleshipFleet(gameId, req.userId!);
      res.status(200).json({
        success: true,
        data: {
          game: GameService.sanitizeGameForUser(game, req.userId!),
          fleet,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async readyFleet(req: Request, res: Response, next: NextFunction) {
    try {
      const { gameId } = req.body;
      const game = await GameService.readyBattleshipFleet(gameId, req.userId!);
      res.status(200).json({
        success: true,
        data: GameService.sanitizeGameForUser(game, req.userId!),
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
      } else if (move.target !== undefined) {
        const res = await GameService.handleBattleshipFire(gameId, req.userId!, move.target);
        updatedGame = res.game;
      } else if (move.from !== undefined && move.to !== undefined) {
        const res = await GameService.handleCheckersMove(gameId, req.userId!, move.from, move.to);
        updatedGame = res.game;
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_MOVE', message: 'Move must specify cellIndex, calledNumber, target, or from/to' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: GameService.sanitizeGameForUser(updatedGame, req.userId!),
      });
    } catch (error) {
      next(error);
    }
  }

  static async restartGame(req: Request, res: Response, next: NextFunction) {
    try {
      const { gameId } = req.body;
      const game = await GameService.restartGame(req.coupleId!, req.userId!, gameId);
      res.status(200).json({
        success: true,
        data: GameService.sanitizeGameForUser(game, req.userId!),
      });
    } catch (error) {
      next(error);
    }
  }

  static async endGame(req: Request, res: Response, next: NextFunction) {
    try {
      const { gameId } = req.body;
      const game = await GameService.endGame(req.coupleId!, req.userId!, gameId);
      res.status(200).json({
        success: true,
        data: GameService.sanitizeGameForUser(game, req.userId!),
      });
    } catch (error) {
      next(error);
    }
  }
}
