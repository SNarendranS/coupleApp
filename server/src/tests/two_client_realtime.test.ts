import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { io as ClientSocket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { AuthService } from '../services/auth.service';
import { connectDatabase } from '../config/db';
import { createApp } from '../app';
import { setupSocketServer } from '../socket';
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
  let httpServer: http.Server;
  let port: number = 5000;

  before(async () => {
    await connectDatabase();

    const app = createApp();
    httpServer = http.createServer(app);
    setupSocketServer(httpServer);
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const addr = httpServer.address();
        if (addr && typeof addr === 'object') {
          port = addr.port;
        }
        resolve();
      });
    });

    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash('password123', 10);

    let loginA: any, loginB: any;

    let uA = await User.findOne({ $or: [{ username: 'alex' }, { email: 'alex@example.com' }] });
    if (!uA) {
      loginA = await AuthService.register({ username: 'alex', email: 'alex@example.com', password: 'password123', displayName: 'Alex' });
    } else {
      uA.passwordHash = hash;
      await uA.save();
      loginA = await AuthService.login({ login: uA.email, password: 'password123' });
    }

    let uB = await User.findOne({ $or: [{ username: 'sam' }, { email: 'sam@example.com' }] });
    if (!uB) {
      loginB = await AuthService.register({ username: 'sam', email: 'sam@example.com', password: 'password123', displayName: 'Sam' });
    } else {
      uB.passwordHash = hash;
      await uB.save();
      loginB = await AuthService.login({ login: uB.email, password: 'password123' });
    }

    userA = loginA.user;
    userB = loginB.user;
    tokenA = loginA.token;
    tokenB = loginB.token;

    let c = await Couple.findOne({ memberIds: { $all: [userA.id, userB.id] } });
    if (!c) {
      c = await Couple.create({
        memberIds: [userA.id, userB.id],
        name: 'Alex & Sam',
      });
      await User.findByIdAndUpdate(userA.id, { coupleId: c._id });
      await User.findByIdAndUpdate(userB.id, { coupleId: c._id });
    }
    couple = c;
    assert.ok(couple, 'Couple must exist');
  });

  after(async () => {
    if (socketA) socketA.disconnect();
    if (socketB) socketB.disconnect();
    await new Promise((r) => setTimeout(r, 300));
    if (httpServer) {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    }
    await mongoose.connection.close();
  });

  test('1. Connect two authenticated sockets to Socket.IO server', async () => {
    socketA = ClientSocket(`http://localhost:${port}`, {
      auth: { token: tokenA },
      transports: ['websocket'],
    });

    socketB = ClientSocket(`http://localhost:${port}`, {
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
