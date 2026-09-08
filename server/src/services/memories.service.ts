import { Memory, Activity } from '../models';
import { MemoryInput } from '@couple/shared';

export class MemoriesService {
  static async getMemories(coupleId: string) {
    return Memory.find({ coupleId })
      .populate('createdBy', 'displayName username avatarUrl')
      .sort({ date: -1, createdAt: -1 });
  }

  static async createMemory(coupleId: string, userId: string, input: MemoryInput) {
    const memory = await Memory.create({
      coupleId,
      createdBy: userId,
      title: input.title,
      description: input.description || '',
      date: input.date,
      imageUrls: input.imageUrls || [],
      location: input.location || '',
      tags: input.tags || [],
    });

    await Activity.create({
      coupleId,
      userId,
      action: 'memory_added',
      details: `Created a memory: "${input.title}"`,
    });

    return memory.populate('createdBy', 'displayName username avatarUrl');
  }

  static async updateMemory(coupleId: string, memoryId: string, updates: Partial<MemoryInput>) {
    const memory = await Memory.findOneAndUpdate(
      { _id: memoryId, coupleId },
      { $set: updates },
      { new: true }
    ).populate('createdBy', 'displayName username avatarUrl');

    if (!memory) {
      const err: any = new Error('Memory not found');
      err.statusCode = 404;
      throw err;
    }

    return memory;
  }

  static async deleteMemory(coupleId: string, memoryId: string) {
    const memory = await Memory.findOneAndDelete({ _id: memoryId, coupleId });
    if (!memory) {
      const err: any = new Error('Memory not found');
      err.statusCode = 404;
      throw err;
    }
    return { deleted: true };
  }
}
