import { Server } from 'socket.io';
import { AuthenticatedSocket } from './auth';
import { User } from '../models';
import { SOCKET_EVENTS } from '@couple/shared';

// Track connection counts per user
const activeConnections = new Map<string, number>();

export class PresenceManager {
  static async handleConnect(io: Server, socket: AuthenticatedSocket) {
    const userId = socket.data.userId;
    const coupleId = socket.data.coupleId;

    const count = (activeConnections.get(userId) || 0) + 1;
    activeConnections.set(userId, count);

    // Update user status
    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      lastSeenAt: new Date(),
    });

    if (coupleId) {
      // Broadcast to partner in couple room
      socket.to(`couple:${coupleId}`).emit(SOCKET_EVENTS.PRESENCE_UPDATE, {
        userId,
        isOnline: true,
        lastSeenAt: new Date().toISOString(),
      });
    }
  }

  static async handleDisconnect(io: Server, socket: AuthenticatedSocket) {
    const userId = socket.data.userId;
    const coupleId = socket.data.coupleId;

    const count = (activeConnections.get(userId) || 1) - 1;
    if (count <= 0) {
      activeConnections.delete(userId);

      const now = new Date();
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeenAt: now,
      });

      if (coupleId) {
        socket.to(`couple:${coupleId}`).emit(SOCKET_EVENTS.PRESENCE_UPDATE, {
          userId,
          isOnline: false,
          lastSeenAt: now.toISOString(),
        });
      }
    } else {
      activeConnections.set(userId, count);
    }
  }

  static handleActivity(socket: AuthenticatedSocket, activity: string) {
    const coupleId = socket.data.coupleId;
    if (coupleId) {
      socket.to(`couple:${coupleId}`).emit(SOCKET_EVENTS.PRESENCE_ACTIVITY, {
        userId: socket.data.userId,
        activity,
      });
    }
  }
}
