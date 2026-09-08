import { Request, Response, NextFunction } from 'express';
import { CalendarService } from '../services/calendar.service';
import { emitToCouple } from '../socket';
import { SOCKET_EVENTS } from '@couple/shared';

export class CalendarController {
  static async getEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const events = await CalendarService.getEvents(req.coupleId!);
      res.status(200).json({
        success: true,
        data: events,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await CalendarService.createEvent(req.coupleId!, req.userId!, req.body);
      emitToCouple(req.coupleId!, SOCKET_EVENTS.CALENDAR_EVENT_CREATED, event);
      res.status(201).json({
        success: true,
        data: event,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const event = await CalendarService.updateEvent(req.coupleId!, id, req.body);
      emitToCouple(req.coupleId!, SOCKET_EVENTS.CALENDAR_EVENT_UPDATED, event);
      res.status(200).json({
        success: true,
        data: event,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await CalendarService.deleteEvent(req.coupleId!, id);
      emitToCouple(req.coupleId!, SOCKET_EVENTS.CALENDAR_EVENT_DELETED, { id });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
