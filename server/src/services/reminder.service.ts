import crypto from 'crypto';
import { Types } from 'mongoose';
import { CalendarEvent, Couple, Notification, ICalendarEvent } from '../models';
import { emitToUser } from '../socket';
import { SOCKET_EVENTS } from '@couple/shared';

export interface ProcessedReminderResult {
  processedCount: number;
  results: {
    eventId: string;
    reminderId: string;
    title: string;
    recipients: string[];
  }[];
}

export class ReminderService {
  /**
   * Helper to calculate scheduled Date from event date, time, and minutesBefore.
   */
  static calculateScheduledFor(
    startDate: string,
    startTime?: string,
    allDay: boolean = true,
    minutesBefore: number = 0
  ): Date {
    // If all day, default anchor is 09:00 AM local
    const timeStr = !allDay && startTime ? startTime : '09:00';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const [year, month, day] = startDate.split('-').map(Number);

    const eventDate = new Date(Date.UTC(year, month - 1, day, hours || 9, minutes || 0, 0));
    const scheduledTime = eventDate.getTime() - minutesBefore * 60 * 1000;
    return new Date(scheduledTime);
  }

  /**
   * Ensure reminders array has generated IDs and valid scheduledFor dates.
   */
  static normalizeReminders(
    reminders: any[],
    startDate: string,
    startTime?: string,
    allDay: boolean = true
  ) {
    if (!Array.isArray(reminders)) return [];

    return reminders.map((r) => {
      const minutes = typeof r.minutesBefore === 'number' ? r.minutesBefore : 0;
      const scheduledFor = r.scheduledFor
        ? new Date(r.scheduledFor)
        : this.calculateScheduledFor(startDate, startTime, allDay, minutes);

      return {
        id: r.id || crypto.randomUUID(),
        minutesBefore: minutes,
        scheduledFor,
        isProcessed: Boolean(r.isProcessed),
        notifyPartner: r.notifyPartner !== false,
      };
    });
  }

  /**
   * Process all due reminders across all couples or for a specific couple.
   * Atomic, idempotent, race-safe claim ensures no duplicate notifications.
   */
  static async processDueReminders(targetCoupleId?: string): Promise<ProcessedReminderResult> {
    const now = new Date();

    const query: any = {
      reminders: {
        $elemMatch: {
          scheduledFor: { $lte: now },
          isProcessed: false,
        },
      },
    };

    if (targetCoupleId) {
      query.coupleId = new Types.ObjectId(targetCoupleId);
    }

    // Find candidate events that have at least one due, unhandled reminder
    const candidateEvents = await CalendarEvent.find(query);
    const results: ProcessedReminderResult['results'] = [];
    let processedCount = 0;

    for (const event of candidateEvents) {
      if (!event.reminders || event.reminders.length === 0) continue;

      for (const reminder of event.reminders) {
        const scheduledTime = new Date(reminder.scheduledFor);
        if (reminder.isProcessed || scheduledTime > now) {
          continue;
        }

        // Atomic claim: update isProcessed to true only if it is still false
        const claimedEvent = await CalendarEvent.findOneAndUpdate(
          {
            _id: event._id,
            reminders: {
              $elemMatch: {
                id: reminder.id,
                isProcessed: false,
              },
            },
          },
          {
            $set: {
              'reminders.$.isProcessed': true,
            },
          },
          { new: true }
        );

        // If another worker or thread already claimed it, skip
        if (!claimedEvent) {
          continue;
        }

        processedCount++;

        // Retrieve couple members to deliver in-app notifications
        const couple = await Couple.findById(event.coupleId);
        const recipientIds: string[] = [];

        if (couple && Array.isArray(couple.memberIds)) {
          for (const memberId of couple.memberIds) {
            const memberIdStr = memberId.toString();
            recipientIds.push(memberIdStr);

            try {
              const notification = await Notification.create({
                userId: memberId,
                coupleId: event.coupleId,
                type: 'calendar_reminder',
                title: `Reminder: ${event.title}`,
                message: event.startTime
                  ? `${event.title} is coming up at ${event.startTime}${event.location ? ` (${event.location})` : ''}`
                  : `${event.title} is coming up on ${event.startDate}`,
                read: false,
                metadata: {
                  eventId: event._id.toString(),
                  reminderId: reminder.id,
                  startDate: event.startDate,
                  startTime: event.startTime,
                  location: event.location,
                  icon: 'bell',
                },
              });

              // Realtime in-app notification emit
              emitToUser(memberIdStr, SOCKET_EVENTS.NOTIFICATION_NEW, notification);
            } catch (err) {
              console.error(`Failed to dispatch reminder notification to ${memberIdStr}:`, err);
            }
          }
        }

        results.push({
          eventId: event._id.toString(),
          reminderId: reminder.id,
          title: event.title,
          recipients: recipientIds,
        });
      }
    }

    return {
      processedCount,
      results,
    };
  }
}
