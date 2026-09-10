import { Types } from 'mongoose';
import { CalendarEvent, Activity, Memory, ICalendarEvent } from '../models';
import {
  CalendarCategory,
  CalendarEventDTO,
  CountdownItemDTO,
  OurStoryItemDTO,
  OurStoryTimelineYearGroup,
  OurStoryTimelineMonthGroup,
  MilestoneType,
} from '@couple/shared';
import { ReminderService } from './reminder.service';

export interface GetEventsOptions {
  month?: string; // YYYY-MM
  start?: string; // YYYY-MM-DD
  end?: string; // YYYY-MM-DD
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export class CalendarService {
  /**
   * Populate linked memories for a list of calendar events.
   */
  private static async attachLinkedMoments(events: any[]): Promise<any[]> {
    const memoryIds = events.flatMap((e) => (e.linkedMemoryIds || []).map((id: any) => id.toString()));
    const uniqueIds = Array.from(new Set(memoryIds));

    let memoriesMap = new Map<string, any>();
    if (uniqueIds.length > 0) {
      const memories = await Memory.find({ _id: { $in: uniqueIds } });
      for (const m of memories) {
        memoriesMap.set(m._id.toString(), {
          id: m._id.toString(),
          title: m.title,
          date: m.date,
          imageUrls: m.imageUrls || [],
          location: m.location,
        });
      }
    }

    return events.map((e) => {
      const dto = typeof e.toJSON === 'function' ? e.toJSON() : { ...e };
      dto._id = dto._id || e._id || dto.id;
      dto.id = dto.id || (dto._id ? dto._id.toString() : undefined);
      if (dto.linkedMemoryIds && Array.isArray(dto.linkedMemoryIds)) {
        dto.linkedMoments = dto.linkedMemoryIds
          .map((id: any) => memoriesMap.get(id.toString()))
          .filter(Boolean);
      } else {
        dto.linkedMoments = [];
      }
      return dto;
    });
  }

  /**
   * Expand recurring occurrences for a date range.
   */
  private static expandRecurrences(
    events: any[],
    rangeStart: string,
    rangeEnd: string
  ): any[] {
    const startD = new Date(rangeStart);
    const endD = new Date(rangeEnd);
    const expanded: any[] = [];

    for (const evt of events) {
      const baseDateStr = evt.startDate || evt.date;
      if (baseDateStr >= rangeStart && baseDateStr <= rangeEnd) {
        expanded.push(evt);
      }

      if (!evt.recurrence || evt.recurrence.frequency === 'none') {
        continue;
      }

      const { frequency, interval = 1, endDate: recEndDate } = evt.recurrence;
      const baseDate = new Date(baseDateStr);
      const limitEnd = recEndDate ? new Date(recEndDate) : endD;
      const actualEnd = limitEnd < endD ? limitEnd : endD;

      let cur = new Date(baseDate);

      // Advance at least one interval
      while (cur <= actualEnd) {
        if (frequency === 'weekly') {
          cur.setDate(cur.getDate() + 7 * interval);
        } else if (frequency === 'monthly') {
          cur.setMonth(cur.getMonth() + interval);
        } else if (frequency === 'yearly') {
          cur.setFullYear(cur.getFullYear() + interval);
        } else {
          break;
        }

        if (cur > actualEnd) break;

        const dateStr = cur.toISOString().split('T')[0];
        if (dateStr >= rangeStart && dateStr <= rangeEnd && dateStr !== baseDateStr) {
          expanded.push({
            ...evt,
            id: `${evt.id}_occ_${dateStr}`,
            originalEventId: evt.id,
            isOccurrence: true,
            startDate: dateStr,
            date: dateStr,
          });
        }
      }
    }

    return expanded.sort((a, b) => (a.startDate || a.date).localeCompare(b.startDate || b.date));
  }

  /**
   * Retrieve calendar events with optional date-range or month filtering.
   */
  static async getEvents(coupleId: string, options: GetEventsOptions = {}) {
    let { month, start, end } = options;

    if (month && !start && !end) {
      const [y, m] = month.split('-').map(Number);
      start = `${month}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      end = `${month}-${String(lastDay).padStart(2, '0')}`;
    }

    let query: any = { coupleId };

    if (start && end) {
      // Find events that fall directly into window OR are recurring
      query = {
        coupleId,
        $or: [
          { startDate: { $gte: start, $lte: end } },
          { date: { $gte: start, $lte: end } },
          { 'recurrence.frequency': { $in: ['weekly', 'monthly', 'yearly'] } },
          { isRecurringYearly: true },
        ],
      };
    }

    const rawEvents = await CalendarEvent.find(query).sort({ startDate: 1, date: 1 });
    const eventsWithMoments = await this.attachLinkedMoments(rawEvents);

    if (start && end) {
      return this.expandRecurrences(eventsWithMoments, start, end);
    }

    return eventsWithMoments;
  }

  /**
   * Create a new couple calendar event.
   */
  static async createEvent(coupleId: string, userId: string, input: any) {
    const startDate = input.startDate || input.date;
    const date = startDate;

    let eventTypes: CalendarCategory[] = input.eventTypes;
    if (!eventTypes || eventTypes.length === 0) {
      if (input.type === 'anniversary' || input.type === 'birthday') {
        eventTypes = ['milestone'];
      } else if (input.type === 'memory') {
        eventTypes = ['memory'];
      } else {
        eventTypes = ['plan'];
      }
    }

    // Normalize recurrence
    let recurrence = input.recurrence;
    if (!recurrence && input.isRecurringYearly) {
      recurrence = { frequency: 'yearly', interval: 1 };
    }

    // Normalize reminders
    const reminders = ReminderService.normalizeReminders(
      input.reminders || [],
      startDate,
      input.startTime,
      input.allDay !== false
    );

    // If legacy reminderMinutes provided
    if ((!reminders || reminders.length === 0) && input.reminderMinutes && input.reminderMinutes > 0) {
      reminders.push({
        id: 'legacy-rem-1',
        minutesBefore: input.reminderMinutes,
        scheduledFor: ReminderService.calculateScheduledFor(
          startDate,
          input.startTime,
          input.allDay !== false,
          input.reminderMinutes
        ),
        isProcessed: false,
        notifyPartner: true,
      });
    }

    const event = await CalendarEvent.create({
      coupleId,
      createdBy: userId,
      title: input.title,
      description: input.description || '',
      notes: input.notes || '',
      eventTypes,
      type: input.type || 'plan',
      startDate,
      date,
      endDate: input.endDate || '',
      startTime: input.startTime || '',
      endTime: input.endTime || '',
      allDay: input.allDay !== false,
      location: input.location || '',
      imageUrl: input.imageUrl || '',
      imagePublicId: input.imagePublicId || '',
      recurrence: recurrence || { frequency: 'none', interval: 1 },
      reminders,
      countdown: input.countdown || { enabled: false, isPrimary: false },
      milestone: input.milestone || {
        isMilestone: eventTypes.includes('milestone'),
        milestoneType: input.type === 'anniversary' ? 'anniversary' : 'custom',
        showOnHome: eventTypes.includes('milestone'),
      },
      linkedMemoryIds: input.linkedMemoryIds || [],
      reminderMinutes: input.reminderMinutes || 0,
      isRecurringYearly: recurrence?.frequency === 'yearly',
    });

    await Activity.create({
      coupleId,
      userId,
      action: 'calendar_added',
      details: `Added new ${eventTypes.join(', ')}: "${input.title}"`,
    });

    const populated = await this.attachLinkedMoments([event]);
    return populated[0];
  }

  /**
   * Update an existing event.
   */
  static async updateEvent(coupleId: string, eventId: string, updates: any) {
    const existing = await CalendarEvent.findOne({ _id: eventId, coupleId });
    if (!existing) {
      const err: any = new Error('Calendar event not found');
      err.statusCode = 404;
      throw err;
    }

    const startDate = updates.startDate || updates.date || existing.startDate;
    const startTime = updates.startTime !== undefined ? updates.startTime : existing.startTime;
    const allDay = updates.allDay !== undefined ? updates.allDay : existing.allDay;

    if (updates.reminders) {
      updates.reminders = ReminderService.normalizeReminders(updates.reminders, startDate, startTime, allDay);
    } else if (updates.startDate || updates.startTime) {
      // Re-calculate scheduledFor dates if date or time changed
      updates.reminders = ReminderService.normalizeReminders(
        existing.reminders || [],
        startDate,
        startTime,
        allDay
      );
    }

    if (updates.startDate && !updates.date) {
      updates.date = updates.startDate;
    }
    if (updates.date && !updates.startDate) {
      updates.startDate = updates.date;
    }

    const event = await CalendarEvent.findOneAndUpdate(
      { _id: eventId, coupleId },
      { $set: updates },
      { new: true }
    );

    const populated = await this.attachLinkedMoments([event!]);
    return populated[0];
  }

  /**
   * Delete an event.
   */
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

    return { deleted: true, id: eventId };
  }

  /**
   * Derive active countdowns dynamically from CalendarEvent records.
   */
  static async getCountdowns(coupleId: string): Promise<CountdownItemDTO[]> {
    const events = await CalendarEvent.find({
      coupleId,
      'countdown.enabled': true,
    });

    const now = new Date();
    const countdowns: CountdownItemDTO[] = [];

    for (const evt of events) {
      let targetDateStr = evt.startDate || evt.date;

      // If yearly recurring and target date already passed this year, calculate next year
      if (evt.recurrence?.frequency === 'yearly' || evt.isRecurringYearly) {
        const [, m, d] = targetDateStr.split('-').map(Number);
        const thisYearTarget = new Date(Date.UTC(now.getFullYear(), m - 1, d, 0, 0, 0));
        if (thisYearTarget.getTime() < now.getTime()) {
          targetDateStr = `${now.getFullYear() + 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        } else {
          targetDateStr = `${now.getFullYear()}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
      }

      const [y, m, d] = targetDateStr.split('-').map(Number);
      let hours = 0;
      let minutes = 0;

      if (!evt.allDay && evt.startTime) {
        const [h, min] = evt.startTime.split(':').map(Number);
        hours = h || 0;
        minutes = min || 0;
      }

      const targetTimestamp = new Date(Date.UTC(y, m - 1, d, hours, minutes, 0));
      const diffMs = targetTimestamp.getTime() - now.getTime();

      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const hoursRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));

      let status: 'upcoming' | 'today' | 'passed' = 'upcoming';
      if (daysRemaining < 0) {
        status = 'passed';
      } else if (daysRemaining === 0) {
        status = 'today';
      }

      countdowns.push({
        eventId: evt._id.toString(),
        title: evt.title,
        targetDate: targetDateStr,
        targetTime: evt.startTime,
        targetTimestamp: targetTimestamp.toISOString(),
        daysRemaining,
        hoursRemaining,
        status,
        isPrimary: Boolean(evt.countdown?.isPrimary),
        customLabel: evt.countdown?.customLabel || '',
        category: (evt.eventTypes?.[0] as CalendarCategory) || 'plan',
        milestoneType: evt.milestone?.milestoneType as MilestoneType,
      });
    }

    // Sort: Primary first, then upcoming by daysRemaining asc, then today, then passed
    return countdowns.sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;

      if (a.status === 'today' && b.status !== 'today') return -1;
      if (b.status === 'today' && a.status !== 'today') return 1;

      if (a.status === 'upcoming' && b.status === 'passed') return -1;
      if (b.status === 'upcoming' && a.status === 'passed') return 1;

      return a.daysRemaining - b.daysRemaining;
    });
  }

  /**
   * Derive "Our Story" timeline from Calendar events and Memories without duplication.
   */
  static async getOurStory(coupleId: string) {
    const [events, memories] = await Promise.all([
      CalendarEvent.find({ coupleId }).sort({ startDate: -1, date: -1 }),
      Memory.find({ coupleId }).sort({ date: -1 }),
    ]);

    const eventsWithMoments = await this.attachLinkedMoments(events);

    // Track which memories are linked to events to avoid duplicate standalone display
    const linkedMemoryIdSet = new Set<string>();
    for (const evt of events) {
      if (evt.linkedMemoryIds && Array.isArray(evt.linkedMemoryIds)) {
        for (const mid of evt.linkedMemoryIds) {
          linkedMemoryIdSet.add(mid.toString());
        }
      }
    }

    const storyItems: OurStoryItemDTO[] = [];

    // 1. Add Calendar Events (Plans, Milestones, Memories)
    for (const evt of eventsWithMoments) {
      const dateStr = evt.startDate || evt.date;
      const [y, m] = dateStr.split('-').map(Number);

      const photos: string[] = [];
      if (evt.imageUrl) photos.push(evt.imageUrl);
      if (evt.linkedMoments && Array.isArray(evt.linkedMoments)) {
        for (const mom of evt.linkedMoments) {
          if (mom.imageUrls && Array.isArray(mom.imageUrls)) {
            photos.push(...mom.imageUrls);
          }
        }
      }

      storyItems.push({
        id: `cal_${evt.id}`,
        sourceType: 'calendar_event',
        calendarEventId: evt.id,
        title: evt.title,
        date: dateStr,
        year: y,
        month: m,
        description: evt.description || evt.notes || '',
        location: evt.location || '',
        categories: evt.eventTypes || ['plan'],
        milestoneType: evt.milestone?.milestoneType,
        photos: Array.from(new Set(photos)),
        linkedMemoryCount: evt.linkedMoments?.length || 0,
        createdAt: evt.createdAt?.toString() || new Date().toISOString(),
      });
    }

    // 2. Add Standalone Memories that aren't already linked to any calendar event
    for (const mem of memories) {
      const memId = mem._id.toString();
      if (linkedMemoryIdSet.has(memId)) {
        continue; // deduplicated!
      }

      const [y, m] = mem.date.split('-').map(Number);
      storyItems.push({
        id: `mem_${memId}`,
        sourceType: 'memory',
        memoryId: memId,
        title: mem.title,
        date: mem.date,
        year: y,
        month: m,
        description: mem.description || '',
        location: mem.location || '',
        categories: ['memory'],
        photos: mem.imageUrls || [],
        linkedMemoryCount: 1,
        createdAt: mem.createdAt?.toString() || new Date().toISOString(),
      });
    }

    // Sort all story items chronologically descending
    storyItems.sort((a, b) => b.date.localeCompare(a.date));

    // Group into Years -> Months
    const yearMap = new Map<number, Map<number, OurStoryItemDTO[]>>();

    for (const item of storyItems) {
      if (!yearMap.has(item.year)) {
        yearMap.set(item.year, new Map());
      }
      const monthMap = yearMap.get(item.year)!;
      if (!monthMap.has(item.month)) {
        monthMap.set(item.month, []);
      }
      monthMap.get(item.month)!.push(item);
    }

    const timeline: OurStoryTimelineYearGroup[] = [];
    const sortedYears = Array.from(yearMap.keys()).sort((a, b) => b - a);

    for (const yr of sortedYears) {
      const monthMap = yearMap.get(yr)!;
      const sortedMonths = Array.from(monthMap.keys()).sort((a, b) => b - a);
      const months: OurStoryTimelineMonthGroup[] = [];

      for (const mo of sortedMonths) {
        months.push({
          month: mo,
          monthName: MONTH_NAMES[mo - 1] || `Month ${mo}`,
          items: monthMap.get(mo)!,
        });
      }

      timeline.push({
        year: yr,
        months,
      });
    }

    return {
      timeline,
      totalCount: storyItems.length,
    };
  }

  /**
   * Link an existing Memory/Moment to a CalendarEvent.
   */
  static async linkMemory(coupleId: string, eventId: string, memoryId: string) {
    const [event, memory] = await Promise.all([
      CalendarEvent.findOne({ _id: eventId, coupleId }),
      Memory.findOne({ _id: memoryId, coupleId }),
    ]);

    if (!event) {
      const err: any = new Error('Calendar event not found');
      err.statusCode = 404;
      throw err;
    }

    if (!memory) {
      const err: any = new Error('Memory not found');
      err.statusCode = 404;
      throw err;
    }

    const updated = await CalendarEvent.findOneAndUpdate(
      { _id: eventId, coupleId },
      { $addToSet: { linkedMemoryIds: new Types.ObjectId(memoryId) } },
      { new: true }
    );

    const populated = await this.attachLinkedMoments([updated!]);
    return populated[0];
  }

  /**
   * Create a new Memory attached to an existing CalendarEvent.
   */
  static async createMemoryForEvent(coupleId: string, userId: string, eventId: string, memoryData: any) {
    const event = await CalendarEvent.findOne({ _id: eventId, coupleId });
    if (!event) {
      const err: any = new Error('Calendar event not found');
      err.statusCode = 404;
      throw err;
    }

    const memory = await Memory.create({
      coupleId,
      createdBy: userId,
      title: memoryData.title || event.title,
      description: memoryData.description || event.description || '',
      date: memoryData.date || event.startDate,
      location: memoryData.location || event.location || '',
      imageUrls: memoryData.imageUrls || [],
      tags: memoryData.tags || ['calendar-memory'],
    });

    const updatedEvent = await CalendarEvent.findOneAndUpdate(
      { _id: eventId, coupleId },
      {
        $addToSet: { linkedMemoryIds: memory._id },
        $set: {
          // If event doesn't already have 'memory' category, add it
          ...(event.eventTypes.includes('memory') ? {} : { eventTypes: [...event.eventTypes, 'memory'] }),
        },
      },
      { new: true }
    );

    const populated = await this.attachLinkedMoments([updatedEvent!]);
    return {
      event: populated[0],
      memory,
    };
  }
}
