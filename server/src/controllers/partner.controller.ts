import { Request, Response, NextFunction } from 'express';
import { PartnerService } from '../services/partner.service';
import { emitToUser } from '../socket';
import { SOCKET_EVENTS } from '@couple/shared';

export class PartnerController {
  static async search(req: Request, res: Response, next: NextFunction) {
    try {
      const q = (req.query.q as string) || '';
      const results = await PartnerService.searchUsers(q, req.userId!);
      res.status(200).json({
        success: true,
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }

  static async sendRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { receiverId } = req.body;
      const request = await PartnerService.sendRequest(req.userId!, receiverId);

      emitToUser(receiverId, SOCKET_EVENTS.NOTIFICATION_NEW, {
        type: 'partner_request',
        title: 'New Partner Request',
        message: `${req.user!.displayName} (@${req.user!.username}) sent you a partner request!`,
      });

      res.status(201).json({
        success: true,
        data: request,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const requests = await PartnerService.getRequests(req.userId!);
      res.status(200).json({
        success: true,
        data: requests,
      });
    } catch (error) {
      next(error);
    }
  }

  static async acceptRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await PartnerService.acceptRequest(id, req.userId!);

      const coupleId = result.couple._id.toString();
      emitToUser(result.sender._id.toString(), SOCKET_EVENTS.PARTNER_CONNECTED, {
        coupleId,
        partner: result.receiver,
      });
      emitToUser(result.receiver._id.toString(), SOCKET_EVENTS.PARTNER_CONNECTED, {
        coupleId,
        partner: result.sender,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async rejectRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await PartnerService.rejectRequest(id, req.userId!);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await PartnerService.cancelRequest(id, req.userId!);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
