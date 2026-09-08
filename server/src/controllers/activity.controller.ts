import { Request, Response, NextFunction } from 'express';
import { ActivityService } from '../services/activity.service';

export class ActivityController {
  static async getActivities(req: Request, res: Response, next: NextFunction) {
    try {
      const activities = await ActivityService.getActivities(req.coupleId!);
      res.status(200).json({
        success: true,
        data: activities,
      });
    } catch (error) {
      next(error);
    }
  }
}
