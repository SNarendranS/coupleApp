import { Request, Response, NextFunction } from 'express';
import { MemoriesService } from '../services/memories.service';
import { emitToCouple } from '../socket';
import { SOCKET_EVENTS } from '@couple/shared';

export class MemoriesController {
  static async getMemories(req: Request, res: Response, next: NextFunction) {
    try {
      const memories = await MemoriesService.getMemories(req.coupleId!);
      res.status(200).json({
        success: true,
        data: memories,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createMemory(req: Request, res: Response, next: NextFunction) {
    try {
      const memory = await MemoriesService.createMemory(req.coupleId!, req.userId!, req.body);
      emitToCouple(req.coupleId!, SOCKET_EVENTS.MEMORY_CREATED, memory);
      res.status(201).json({
        success: true,
        data: memory,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateMemory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const memory = await MemoriesService.updateMemory(req.coupleId!, id, req.body);
      emitToCouple(req.coupleId!, SOCKET_EVENTS.MEMORY_UPDATED, memory);
      res.status(200).json({
        success: true,
        data: memory,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteMemory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await MemoriesService.deleteMemory(req.coupleId!, id);
      emitToCouple(req.coupleId!, SOCKET_EVENTS.MEMORY_DELETED, { id });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
