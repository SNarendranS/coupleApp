import { Request, Response, NextFunction } from 'express';
import { DrawingService } from '../services/drawing.service';

export class DrawingController {
  static async getBoard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await DrawingService.getBoard(req.coupleId!);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async commitStroke(req: Request, res: Response, next: NextFunction) {
    try {
      const stroke = await DrawingService.commitStroke(req.coupleId!, req.userId!, req.body);
      res.status(201).json({
        success: true,
        data: stroke,
      });
    } catch (error) {
      next(error);
    }
  }

  static async clearBoard(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DrawingService.clearBoard(req.coupleId!, req.userId!);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateBackground(req: Request, res: Response, next: NextFunction) {
    try {
      const { backgroundColor } = req.body;
      const board = await DrawingService.updateBackground(req.coupleId!, backgroundColor);
      res.status(200).json({
        success: true,
        data: board,
      });
    } catch (error) {
      next(error);
    }
  }

  static async undoStroke(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DrawingService.undoLastStroke(req.coupleId!, req.userId!);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
