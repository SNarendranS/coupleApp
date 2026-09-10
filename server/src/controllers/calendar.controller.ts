import { Request, Response, NextFunction } from 'express';
import { CalendarService } from '../services/calendar.service';
import { ReminderService } from '../services/reminder.service';
import { emitToCouple } from '../socket';
import { SOCKET_EVENTS } from '@couple/shared';

export class CalendarController {
  /**
   * GET /api/calendar
   * Supports optional query ?month=YYYY-MM or ?start=YYYY-MM-DD&end=YYYY-MM-DD
   */
  static async getEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const { month, start, end } = req.query as { month?: string; start?: string; end?: string };
      const events = await CalendarService.getEvents(req.coupleId!, { month, start, end });
      res.status(200).json({
        success: true,
        data: events,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/calendar
   * Create a multi-property couple calendar event
   */
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

  /**
   * PATCH /api/calendar/:id
   */
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

  /**
   * DELETE /api/calendar/:id
   */
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

  /**
   * GET /api/calendar/countdowns
   * Derived active countdowns
   */
  static async getCountdowns(req: Request, res: Response, next: NextFunction) {
    try {
      const countdowns = await CalendarService.getCountdowns(req.coupleId!);
      res.status(200).json({
        success: true,
        data: countdowns,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/calendar/story
   * Derived "Our Story" timeline aggregating Calendar events & Memories
   */
  static async getOurStory(req: Request, res: Response, next: NextFunction) {
    try {
      const story = await CalendarService.getOurStory(req.coupleId!);
      res.status(200).json({
        success: true,
        data: story,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/calendar/:id/memory
   * Link an existing memory or create a new memory from a past event
   */
  static async attachMemory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { memoryId, ...newMemoryData } = req.body;

      if (memoryId) {
        // Link existing memory
        const event = await CalendarService.linkMemory(req.coupleId!, id, memoryId);
        emitToCouple(req.coupleId!, SOCKET_EVENTS.CALENDAR_EVENT_UPDATED, event);
        return res.status(200).json({
          success: true,
          data: event,
        });
      }

      // Create new memory for event
      const result = await CalendarService.createMemoryForEvent(
        req.coupleId!,
        req.userId!,
        id,
        newMemoryData
      );

      emitToCouple(req.coupleId!, SOCKET_EVENTS.CALENDAR_EVENT_UPDATED, result.event);
      emitToCouple(req.coupleId!, SOCKET_EVENTS.MEMORY_CREATED, result.memory);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/calendar/reminders/process-due
   * Protected worker endpoint: processes due reminders idempotently
   */
  static async processDueReminders(req: Request, res: Response, next: NextFunction) {
    try {
      const workerSecretHeader = req.headers['x-worker-secret'] as string | undefined;
      const configuredSecret = process.env.WORKER_SECRET || process.env.JWT_SECRET;

      let targetCoupleId: string | undefined = undefined;

      // If called with worker secret -> allowed to process system-wide
      if (workerSecretHeader && configuredSecret && workerSecretHeader === configuredSecret) {
        targetCoupleId = undefined;
      } else if (req.coupleId) {
        // If called by authenticated couple user -> allowed to process for their own couple
        targetCoupleId = req.coupleId;
      } else {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized: invalid worker authorization',
        });
      }

      const result = await ReminderService.processDueReminders(targetCoupleId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
