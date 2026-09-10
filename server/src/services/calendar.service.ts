import { CalendarEvent, Activity } from '../models';
import { CalendarEventInput } from '@couple/shared';

export class CalendarService {
  static async getEvents(coupleId: string) {
    const events = await CalendarEvent.find({ coupleId }).sort({ date: 1 });
    return events;
  }

  static async createEvent(coupleId: string, userId: string, input: CalendarEventInput) {
    const event = await CalendarEvent.create({
      coupleId,
      createdBy: userId,
      ...input,
    });

    await Activity.create({
      coupleId,
      userId,
      action: 'calendar_added',
      details: `Added new ${input.type}: "${input.title}"`,
    });

    return event;
  }

  static async updateEvent(coupleId: string, eventId: string, updates: Partial<CalendarEventInput>) {
    const event = await CalendarEvent.findOneAndUpdate(
      { _id: eventId, coupleId },
      { $set: updates },
      { new: true }
    );

    if (!event) {
      const err: any = new Error('Calendar event not found');
      err.statusCode = 404;
      throw err;
    }

    return event;
  }

  static async deleteEvent(coupleId: string, eventId: string) {
    const event = await CalendarEvent.findOneAndDelete({ _id: eventId, coupleId });
    if (!event) {
      const err: any = new Error('Calendar event not found');
      err.statusCode = 404;
      throw err;
    }

    if (event.imagePublicId) {
      import('./storage.service').then(({ storageService }) => {
        storageService.deleteImage(event.imagePublicId!).catch(() => {});
      });
    }

    return { deleted: true };
  }
}
