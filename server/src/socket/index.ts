import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env';
import { socketAuthMiddleware, AuthenticatedSocket } from './auth';
import { PresenceManager } from './presence';
import { registerDrawingHandlers } from './handlers/drawing.handler';
import { registerGameHandlers } from './handlers/game.handler';
import { SOCKET_EVENTS } from '@couple/shared';

let ioInstance: Server | null = null;

export function setupSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: env.NODE_ENV === 'production' ? true : env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 20000,
    pingInterval: 10000,
  });

  ioInstance = io;

  // Authenticate socket connections using JWT
  io.use(socketAuthMiddleware);

  io.on('connection', async (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const userId = authSocket.data.userId;
    const coupleId = authSocket.data.coupleId;

    // Join user's private notification channel
    authSocket.join(`user:${userId}`);

    // If partnered, join the private couple room
    if (coupleId) {
      authSocket.join(`couple:${coupleId}`);
    }

    // Handle presence
    await PresenceManager.handleConnect(io, authSocket);

    // Register feature handlers
    registerDrawingHandlers(io, authSocket);
    registerGameHandlers(io, authSocket);

    // Activity tracking
    authSocket.on(SOCKET_EVENTS.PRESENCE_ACTIVITY, (payload: { activity: string }) => {
      PresenceManager.handleActivity(authSocket, payload.activity);
    });

    // Disconnect cleanup
    authSocket.on('disconnect', async () => {
      await PresenceManager.handleDisconnect(io, authSocket);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!ioInstance) {
    throw new Error('Socket.IO server has not been initialized');
  }
  return ioInstance;
}

export function emitToCouple(coupleId: string, event: string, payload: any) {
  if (ioInstance) {
    ioInstance.to(`couple:${coupleId}`).emit(event, payload);
  }
}

export function emitToUser(userId: string, event: string, payload: any) {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit(event, payload);
  }
}
