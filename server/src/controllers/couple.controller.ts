import { Request, Response, NextFunction } from 'express';
import { CoupleService } from '../services/couple.service';

export class CoupleController {
  static async getDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const details = await CoupleService.getCoupleDetails(req.coupleId!);
      res.status(200).json({
        success: true,
        data: details,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await CoupleService.updateCoupleSettings(req.coupleId!, req.body);
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}
