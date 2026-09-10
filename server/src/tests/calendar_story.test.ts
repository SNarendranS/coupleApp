import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose, { Types } from 'mongoose';
import { connectDatabase } from '../config/db';
import { User, Couple, CalendarEvent, Memory, Notification } from '../models';
import { CalendarService } from '../services/calendar.service';
import { ReminderService } from '../services/reminder.service';

describe('Our Calendar & Story System Tests', () => {
  let coupleAId: string;
  let userA1Id: string;
  let userA2Id: string;

  let coupleBId: string;
  let userB1Id: string;

  before(async () => {
    await connectDatabase();

    // Clean up test data
    await User.deleteMany({ email: { $regex: /@testcalendar\.com$/ } });
    await Couple.deleteMany({ name: { $regex: /Test Calendar/ } });
    await CalendarEvent.deleteMany({ title: { $regex: /^\[Test\]/ } });
    await Memory.deleteMany({ title: { $regex: /^\[Test\]/ } });
    await Notification.deleteMany({ title: { $regex: /^Reminder: \[Test\]/ } });

    // Create Couple A with 2 users
    const u1 = await User.create({
      email: 'alex@testcalendar.com',
      username: 'alex_cal_test',
      passwordHash: 'hashed123',
      displayName: 'Alex',
    });
    const u2 = await User.create({
      email: 'sam@testcalendar.com',
      username: 'sam_cal_test',
      passwordHash: 'hashed123',
      displayName: 'Sam',
    });
    userA1Id = u1._id.toString();
    userA2Id = u2._id.toString();

    const cA = await Couple.create({
      name: 'Test Calendar Couple A',
      memberIds: [u1._id, u2._id],
      relationshipStartDate: new Date('2022-04-14'),
    });
    coupleAId = cA._id.toString();
    await User.updateMany({ _id: { $in: [u1._id, u2._id] } }, { coupleId: cA._id });

    // Create Couple B with 1 user
    const uB = await User.create({
      email: 'charlie@testcalendar.com',
      username: 'charlie_cal_test',
      passwordHash: 'hashed123',
      displayName: 'Charlie',
    });
    userB1Id = uB._id.toString();
    const cB = await Couple.create({
      name: 'Test Calendar Couple B',
      memberIds: [uB._id, new Types.ObjectId()],
      relationshipStartDate: new Date('2023-01-01'),
    });
    coupleBId = cB._id.toString();
    await User.updateOne({ _id: uB._id }, { coupleId: cB._id });
  });

  after(async () => {
    await User.deleteMany({ email: { $regex: /@testcalendar\.com$/ } });
    await Couple.deleteMany({ name: { $regex: /Test Calendar/ } });
    await CalendarEvent.deleteMany({ title: { $regex: /^\[Test\]/ } });
    await Memory.deleteMany({ title: { $regex: /^\[Test\]/ } });
    await Notification.deleteMany({ title: { $regex: /^Reminder: \[Test\]/ } });
    await mongoose.disconnect();
  });

  test('1. Multi-Property Event Creation: Supports Plan + Milestone + Reminders + Countdown', async () => {
    const event = await CalendarService.createEvent(coupleAId, userA1Id, {
      title: '[Test] 5th Anniversary Dinner',
      description: 'Celebrating half a decade together at rooftop restaurant',
      startDate: '2026-09-18',
      startTime: '19:30',
      endTime: '22:00',
      allDay: false,
      eventTypes: ['plan', 'milestone', 'reminder'],
      location: 'Skyline Terrace',
      countdown: {
        enabled: true,
        isPrimary: true,
        customLabel: 'Half a Decade',
      },
      milestone: {
        isMilestone: true,
        milestoneType: 'anniversary',
        showOnHome: true,
      },
      reminders: [
        {
          minutesBefore: 1440, // 1 day before
          isProcessed: false,
        },
        {
          minutesBefore: 120, // 2 hours before
          isProcessed: false,
        },
      ],
    });

    assert.ok(event.id);
    assert.equal(event.title, '[Test] 5th Anniversary Dinner');
    assert.equal(event.startDate, '2026-09-18');
    assert.equal(event.date, '2026-09-18');
    assert.equal(event.countdown?.enabled, true);
    assert.equal(event.countdown?.isPrimary, true);
    assert.equal(event.milestone?.milestoneType, 'anniversary');
    assert.equal(event.reminders?.length, 2);
    assert.ok(event.reminders[0].scheduledFor);
  });

  test('2. Backward Compatibility: Legacy fields (date, type, reminderMinutes, isRecurringYearly)', async () => {
    // Create directly in Mongo simulating an older database record
    const legacyDoc = await CalendarEvent.create({
      coupleId: coupleAId,
      createdBy: userA1Id,
      title: '[Test] Legacy Birthday',
      date: '2026-10-05',
      type: 'birthday',
      allDay: true,
      reminderMinutes: 60,
      isRecurringYearly: true,
    });

    const fetchedEvents = await CalendarService.getEvents(coupleAId);
    const legacyFound = fetchedEvents.find((e) => e.id === legacyDoc._id.toString());

    assert.ok(legacyFound);
    assert.equal(legacyFound.startDate, '2026-10-05');
    assert.ok(legacyFound.eventTypes.includes('milestone'));
  });

  test('3. Recurrence Expansion: Generates occurrences without database pollution', async () => {
    // Yearly recurring event starting 2024-06-15
    await CalendarService.createEvent(coupleAId, userA1Id, {
      title: '[Test] Annual Trip',
      startDate: '2024-06-15',
      allDay: true,
      eventTypes: ['plan'],
      recurrence: {
        frequency: 'yearly',
        interval: 1,
      },
    });

    // Query for June 2026 range
    const eventsJune2026 = await CalendarService.getEvents(coupleAId, {
      start: '2026-06-01',
      end: '2026-06-30',
    });

    const tripOccurrence = eventsJune2026.find((e) => e.title === '[Test] Annual Trip');
    assert.ok(tripOccurrence, 'Expected recurring occurrence in June 2026');
    assert.equal(tripOccurrence.startDate, '2026-06-15');
    assert.equal(tripOccurrence.isOccurrence, true);

    // Verify database document count was not multiplied
    const countInDb = await CalendarEvent.countDocuments({
      coupleId: coupleAId,
      title: '[Test] Annual Trip',
    });
    assert.equal(countInDb, 1, 'Recurrence must not create phantom documents');
  });

  test('4. Countdowns API: Dynamically derives time remaining and respects primary flag', async () => {
    const countdowns = await CalendarService.getCountdowns(coupleAId);
    assert.ok(countdowns.length >= 1);

    const primary = countdowns[0];
    assert.equal(primary.isPrimary, true);
    assert.equal(primary.title, '[Test] 5th Anniversary Dinner');
    assert.ok(typeof primary.daysRemaining === 'number');
    assert.ok(primary.status === 'upcoming' || primary.status === 'today' || primary.status === 'passed');
  });

  test('5. Memory Linking & "Our Story" Deduping: Merges timeline seamlessly', async () => {
    // Create an event
    const event = await CalendarService.createEvent(coupleAId, userA1Id, {
      title: '[Test] Weekend Camping',
      startDate: '2025-08-10',
      allDay: true,
      eventTypes: ['plan'],
    });

    // Create a memory directly linked to that event
    const memoryRes = await CalendarService.createMemoryForEvent(coupleAId, userA1Id, event.id, {
      title: '[Test] Campfire Under Stars',
      description: 'Roasting marshmallows',
      imageUrls: ['https://example.com/marshmallow.jpg'],
    });

    assert.ok(memoryRes.memory.id);
    assert.ok(memoryRes.event.linkedMoments?.length >= 1);

    // Also create an unlinked standalone memory
    await Memory.create({
      coupleId: coupleAId,
      createdBy: userA1Id,
      title: '[Test] Random Cute Moment',
      description: 'Coffee date',
      date: '2025-07-20',
      imageUrls: ['https://example.com/coffee.jpg'],
      tags: [],
    });

    // Fetch Our Story
    const story = await CalendarService.getOurStory(coupleAId);
    assert.ok(story.timeline.length >= 1);

    const year2025 = story.timeline.find((g) => g.year === 2025);
    assert.ok(year2025, 'Expected year 2025 in timeline');

    // Check that the linked memory photo is attached to the calendar item and not duplicated as a standalone card
    const all2025Items = year2025.months.flatMap((m) => m.items);
    const campingItem = all2025Items.find((i) => i.title === '[Test] Weekend Camping');
    assert.ok(campingItem);
    assert.equal(campingItem.photos.includes('https://example.com/marshmallow.jpg'), true);

    const duplicateStandalone = all2025Items.find((i) => i.title === '[Test] Campfire Under Stars');
    assert.equal(duplicateStandalone, undefined, 'Linked memory must not duplicate as standalone item');

    const standaloneCoffee = all2025Items.find((i) => i.title === '[Test] Random Cute Moment');
    assert.ok(standaloneCoffee, 'Standalone memory should appear in story timeline');
  });

  test('6. Reminders: Idempotent atomic processing and in-app notifications without timers', async () => {
    // Create an event with a reminder that is due in the past
    const pastDate = new Date(Date.now() - 1000 * 60 * 5); // 5 mins ago
    const event = await CalendarEvent.create({
      coupleId: coupleAId,
      createdBy: userA1Id,
      title: '[Test] Urgent Restaurant Reservation',
      startDate: '2026-09-12',
      date: '2026-09-12',
      allDay: true,
      reminders: [
        {
          id: 'rem-past-1',
          minutesBefore: 60,
          scheduledFor: pastDate,
          isProcessed: false,
          notifyPartner: true,
        },
      ],
    });

    // First worker run: should claim and process exactly 1 reminder
    const run1 = await ReminderService.processDueReminders(coupleAId);
    assert.ok(run1.processedCount >= 1);
    const processedThis = run1.results.find((r) => r.eventId === event._id.toString());
    assert.ok(processedThis);
    assert.equal(processedThis.recipients.length, 2, 'Should deliver notification to both partners');

    // Verify in-app Notification was created
    const notifs = await Notification.find({
      coupleId: coupleAId,
      'metadata.eventId': event._id.toString(),
    });
    assert.equal(notifs.length, 2);
    assert.equal(notifs[0].title, 'Reminder: [Test] Urgent Restaurant Reservation');

    // Second worker run immediately after: must be IDEMPOTENT (0 new notifications, 0 re-claims)
    const run2 = await ReminderService.processDueReminders(coupleAId);
    const reProcessed = run2.results.find((r) => r.eventId === event._id.toString());
    assert.equal(reProcessed, undefined, 'Reminder must not be processed twice');

    const notifsAfter = await Notification.countDocuments({
      coupleId: coupleAId,
      'metadata.eventId': event._id.toString(),
    });
    assert.equal(notifsAfter, 2, 'Notification count must remain exactly 2');
  });

  test('7. Couple Security & Isolation: User in Couple B cannot see or modify Couple A events', async () => {
    const eventsCoupleB = await CalendarService.getEvents(coupleBId);
    const coupleAEventsSeen = eventsCoupleB.filter((e) => e.title.startsWith('[Test]'));
    assert.equal(coupleAEventsSeen.length, 0, 'Couple B must not see Couple A events');

    // Couple B trying to delete Couple A event
    const eventA = await CalendarEvent.findOne({ coupleId: coupleAId, title: '[Test] 5th Anniversary Dinner' });
    assert.ok(eventA);

    await assert.rejects(
      async () => {
        await CalendarService.deleteEvent(coupleBId, eventA._id.toString());
      },
      { statusCode: 404 }
    );
  });
});
