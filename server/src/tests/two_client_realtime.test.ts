import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { io as ClientSocket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { AuthService } from '../services/auth.service';
import { connectDatabase } from '../config/db';
import { User, Couple } from '../models';
import { SOCKET_EVENTS } from '@couple/shared';
import mongoose from 'mongoose';

describe('Realtime Two-User Socket.IO Verification', () => {
  let tokenA: string;
  let tokenB: string;
  let userA: any;
  let userB: any;
  let couple: any;
  let socketA: any;
  let socketB: any;

  before(async () => {
    await connectDatabase();

    const loginA = await AuthService.login({ login: 'alex', password: 'password123' });
    const loginB = await AuthService.login({ login: 'sam', password: 'password123' });

    userA = loginA.user;
    userB = loginB.user;
    tokenA = loginA.token;
    tokenB = loginB.token;

    couple = await Couple.findById(userA.coupleId);
    assert.ok(couple, 'Couple must exist');
  });

  after(async () => {
    if (socketA) socketA.disconnect();
    if (socketB) socketB.disconnect();
    await mongoose.connection.close();
  });

  test('1. Connect two authenticated sockets to Socket.IO server', async () => {
    socketA = ClientSocket('http://localhost:5000', {
      auth: { token: tokenA },
      transports: ['websocket'],
    });

    socketB = ClientSocket('http://localhost:5000', {
      auth: { token: tokenB },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise((resolve) => socketA.on('connect', resolve)),
      new Promise((resolve) => socketB.on('connect', resolve)),
    ]);

    await new Promise((r) => setTimeout(r, 150));

    assert.ok(socketA.connected, 'Socket A should be connected');
    assert.ok(socketB.connected, 'Socket B should be connected');
  });

  test('2. Realtime Drawing: Client A commits stroke -> Client B receives it live', async () => {
    const testStroke = {
      strokeId: uuidv4(),
      tool: 'pen' as const,
      color: '#f43f5e',
      width: 5,
      points: [
        { x: 100, y: 100 },
        { x: 110, y: 110 },
      ],
    };

    const strokeReceivedPromise = new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out waiting for stroke commit')), 4000);
      socketB.once(SOCKET_EVENTS.DRAWING_STROKE_COMMIT, (data: any) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

    socketA.emit(SOCKET_EVENTS.DRAWING_STROKE_COMMIT, { stroke: testStroke }, (ack: any) => {
      assert.ok(ack.success, `Ack failed: ${ack.error}`);
    });

    const received = await strokeReceivedPromise;
    assert.ok(received.stroke);
    assert.equal(received.stroke.strokeId, testStroke.strokeId);
    assert.equal(received.stroke.color, testStroke.color);
  });

  test('3. Realtime XO Game: Move made by Client A updates Client B authoritative state', async () => {
    const gamePromise = new Promise<any>((resolve) => {
      socketB.once(SOCKET_EVENTS.GAME_STATE, (game: any) => resolve(game));
    });
    socketA.emit(SOCKET_EVENTS.GAME_CREATE, { type: 'xo' });
    const startedGame = await gamePromise;
    const gameId = startedGame.id || startedGame._id;
    assert.ok(gameId, 'Game ID must exist');
    assert.equal(startedGame.type, 'xo');

    const movePromise = new Promise<any>((resolve) => {
      socketB.once(SOCKET_EVENTS.GAME_STATE, (updated: any) => resolve(updated));
    });

    socketA.emit(SOCKET_EVENTS.GAME_MOVE, {
      gameId,
      move: { cellIndex: 4 },
    });

    const afterMove = await movePromise;
    assert.equal(afterMove.state.board[4], 'X');
    assert.equal(afterMove.state.currentTurn, userB._id.toString());
  });

  test('4. Realtime Presence: Activity tracking propagates between partners', async () => {
    const activityPromise = new Promise<any>((resolve) => {
      socketB.once(SOCKET_EVENTS.PRESENCE_ACTIVITY, (data: any) => resolve(data));
    });

    socketA.emit(SOCKET_EVENTS.PRESENCE_ACTIVITY, { activity: 'Drawing on canvas' });

    const activityData = await activityPromise;
    assert.equal(activityData.activity, 'Drawing on canvas');
    assert.equal(activityData.userId, userA._id.toString());
  });
});
