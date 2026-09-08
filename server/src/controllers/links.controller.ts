import { Request, Response, NextFunction } from 'express';
import { LinksService } from '../services/links.service';
import { emitToCouple } from '../socket';
import { SOCKET_EVENTS } from '@couple/shared';

export class LinksController {
  static async getLinks(req: Request, res: Response, next: NextFunction) {
    try {
      const category = req.query.category as string | undefined;
      const links = await LinksService.getLinks(req.coupleId!, category);
      res.status(200).json({
        success: true,
        data: links,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createLink(req: Request, res: Response, next: NextFunction) {
    try {
      const link = await LinksService.createLink(req.coupleId!, req.userId!, req.body);
      emitToCouple(req.coupleId!, SOCKET_EVENTS.LINK_CREATED, link);
      res.status(201).json({
        success: true,
        data: link,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateLink(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const link = await LinksService.updateLink(req.coupleId!, id, req.body);
      emitToCouple(req.coupleId!, SOCKET_EVENTS.LINK_UPDATED, link);
      res.status(200).json({
        success: true,
        data: link,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteLink(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await LinksService.deleteLink(req.coupleId!, id);
      emitToCouple(req.coupleId!, SOCKET_EVENTS.LINK_DELETED, { id });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
