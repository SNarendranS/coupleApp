import { Request, Response, NextFunction } from 'express';
import { Couple } from '../models';

export async function requireCouple(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user || !req.user.coupleId) {
    res.status(403).json({
      success: false,
      error: {
        code: 'NO_COUPLE',
        message: 'You must be connected with a partner to access this resource',
      },
    });
    return;
  }

  try {
    const couple = await Couple.findById(req.user.coupleId);

    if (!couple) {
      res.status(404).json({
        success: false,
        error: {
          code: 'COUPLE_NOT_FOUND',
          message: 'Couple entity could not be found',
        },
      });
      return;
    }

    // Verify authenticated user is actually a member of this couple
    const isMember = couple.memberIds.some(
      (mId) => mId.toString() === req.user!._id.toString()
    );

    if (!isMember) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You are not a member of this couple',
        },
      });
      return;
    }

    req.couple = couple;
    req.coupleId = couple._id.toString();

    next();
  } catch (error) {
    next(error);
  }
}
