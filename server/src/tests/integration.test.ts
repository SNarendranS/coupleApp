import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/db';
import { AuthService } from '../services/auth.service';
import { PartnerService } from '../services/partner.service';
import { DrawingService } from '../services/drawing.service';
import { GameService } from '../services/game.service';
import { CalendarService } from '../services/calendar.service';
import { User, Couple, DrawingBoard, DrawingStroke, Game, CalendarEvent } from '../models';

describe('UsTwo Backend Integration & Security Tests', () => {
  let userA: any;
  let userB: any;
  let userC: any;
  let coupleAB: any;

  before(async () => {
    await connectDatabase();
    // Clean test accounts if any
    await User.deleteMany({ email: { $in: ['test_a@test.com', 'test_b@test.com', 'test_c@test.com'] } });
  });

  after(async () => {
    // Cleanup created test records
    if (userA) await User.deleteOne({ _id: userA._id });
    if (userB) await User.deleteOne({ _id: userB._id });
    if (userC) await User.deleteOne({ _id: userC._id });
    if (coupleAB) {
      await Couple.deleteOne({ _id: coupleAB._id });
      await DrawingBoard.deleteOne({ coupleId: coupleAB._id });
      await DrawingStroke.deleteMany({ coupleId: coupleAB._id });
      await Game.deleteMany({ coupleId: coupleAB._id });
      await CalendarEvent.deleteMany({ coupleId: coupleAB._id });
    }
    await mongoose.connection.close();
  });

  test('1. Authentication: Register, hash password, prevent duplicates', async () => {
    const regA = await AuthService.register({
      username: 'test_user_a',
      email: 'test_a@test.com',
      password: 'password123',
      displayName: 'Test User A',
    });

    assert.ok(regA.user);
    assert.ok(regA.token);
    assert.equal(regA.user.username, 'test_user_a');
    userA = regA.user;

    // Check duplicate email rejection
    await assert.rejects(
      async () => {
        await AuthService.register({
          username: 'test_user_other',
          email: 'test_a@test.com',
          password: 'password123',
          displayName: 'Duplicate Email',
        });
      },
      { code: 'EMAIL_EXISTS' }
    );

    // Register User B
    const regB = await AuthService.register({
      username: 'test_user_b',
      email: 'test_b@test.com',
      password: 'password123',
      displayName: 'Test User B',
    });
    userB = regB.user;

    // Register User C (unpartnered third-party user)
    const regC = await AuthService.register({
      username: 'test_user_c',
      email: 'test_c@test.com',
      password: 'password123',
      displayName: 'Test User C',
    });
    userC = regC.user;
  });

  test('2. Partner System: Prevent self-request, duplicate requests, and connect couple atomically', async () => {
    // Cannot request oneself
    await assert.rejects(
      async () => {
        await PartnerService.sendRequest(userA._id.toString(), userA._id.toString());
      },
      { code: 'SELF_REQUEST' }
    );

    // Send request from A to B
    const request = await PartnerService.sendRequest(userA._id.toString(), userB._id.toString());
    assert.equal(request.status, 'pending');

    // Duplicate request from A to B must be rejected
    await assert.rejects(
      async () => {
        await PartnerService.sendRequest(userA._id.toString(), userB._id.toString());
      },
      { code: 'REQUEST_ALREADY_PENDING' }
    );

    // Reverse request from B to A must also be rejected while pending
    await assert.rejects(
      async () => {
        await PartnerService.sendRequest(userB._id.toString(), userA._id.toString());
      },
      { code: 'REQUEST_ALREADY_PENDING' }
    );

    // B accepts A's request
    const accepted = await PartnerService.acceptRequest(request._id.toString(), userB._id.toString());
    assert.ok(accepted.couple);
    assert.equal(accepted.couple.memberIds.length, 2);
    coupleAB = accepted.couple;

    // Reload users: both must now have coupleId populated
    const updatedA = await User.findById(userA._id);
    const updatedB = await User.findById(userB._id);
    assert.equal(updatedA?.coupleId?.toString(), coupleAB._id.toString());
    assert.equal(updatedB?.coupleId?.toString(), coupleAB._id.toString());

    // Already partnered user cannot accept or send another request
    await assert.rejects(
      async () => {
        await PartnerService.sendRequest(userA._id.toString(), userC._id.toString());
      },
      { code: 'ALREADY_PARTNERED' }
    );
  });

  test('3. Drawing System: Persistent strokes and concurrency versioning', async () => {
    const stroke = await DrawingService.commitStroke(coupleAB._id.toString(), userA._id.toString(), {
      strokeId: '123e4567-e89b-12d3-a456-426614174000',
      tool: 'pen',
      color: '#f43f5e',
      width: 4,
      points: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
    });

    assert.ok(stroke);
    assert.equal(stroke.strokeId, '123e4567-e89b-12d3-a456-426614174000');

    // Duplicate strokeId must not create duplicates
    const strokeDuplicate = await DrawingService.commitStroke(coupleAB._id.toString(), userA._id.toString(), {
      strokeId: '123e4567-e89b-12d3-a456-426614174000',
      tool: 'pen',
      color: '#f43f5e',
      width: 4,
      points: [{ x: 10, y: 10 }],
    });
    assert.equal(strokeDuplicate.strokeId, stroke.strokeId);

    const boardData = await DrawingService.getBoard(coupleAB._id.toString());
    assert.ok(boardData.board);
    assert.ok(boardData.strokes.length >= 1);
  });

  test('4. XO Game Engine: Server-authoritative turn control and win calculation', async () => {
    const game = await GameService.startXOGame(coupleAB._id.toString(), userA._id.toString());
    assert.equal(game.status, 'in_progress');
    const state = game.state;
    assert.equal(state.currentTurn, userA._id.toString());

    // Turn 1: User A plays cell 0
    let updated = await GameService.handleXOMove(game._id.toString(), userA._id.toString(), 0);
    assert.equal(updated.state.board[0], 'X');
    assert.equal(updated.state.currentTurn, userB._id.toString());

    // Wrong turn: User A attempts to play again -> must reject
    await assert.rejects(
      async () => {
        await GameService.handleXOMove(game._id.toString(), userA._id.toString(), 1);
      },
      { code: 'NOT_YOUR_TURN' }
    );

    // Turn 2: User B plays cell 3
    updated = await GameService.handleXOMove(game._id.toString(), userB._id.toString(), 3);
    assert.equal(updated.state.board[3], 'O');

    // Turn 3: User A plays cell 1
    updated = await GameService.handleXOMove(game._id.toString(), userA._id.toString(), 1);
    // Turn 4: User B plays cell 4
    updated = await GameService.handleXOMove(game._id.toString(), userB._id.toString(), 4);
    // Turn 5: User A plays cell 2 (Winning move: [0, 1, 2])
    updated = await GameService.handleXOMove(game._id.toString(), userA._id.toString(), 2);

    assert.equal(updated.status, 'finished');
    assert.equal(updated.winner?.toString(), userA._id.toString());
    assert.deepEqual(updated.state.winningLine, [0, 1, 2]);
  });

  test('5. Calendar Engine: Shared couple events', async () => {
    const event = await CalendarService.createEvent(coupleAB._id.toString(), userA._id.toString(), {
      title: 'Our Special Dinner',
      date: '2026-10-15',
      allDay: true,
      type: 'plan',
      location: 'Moonlight Bistro',
      isRecurringYearly: false,
    });

    assert.ok(event._id);
    assert.equal(event.title, 'Our Special Dinner');

    const events = await CalendarService.getEvents(coupleAB._id.toString());
    assert.ok(events.length >= 1);
  });
});
