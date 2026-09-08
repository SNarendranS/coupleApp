import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User, IUser } from '../models';

export interface AuthenticatedSocket extends Socket {
  data: {
    user: IUser;
    userId: string;
    coupleId: string | null;
  };
}

function parseCookieHeader(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  const list: Record<string, string> = {};
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts[0]?.trim();
    const val = parts[1]?.trim();
    if (name && val) {
      list[name] = decodeURIComponent(val);
    }
  });
  return list;
}

export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  try {
    let token = socket.handshake.auth?.token;

    if (!token && socket.handshake.headers.cookie) {
      const parsedCookies = parseCookieHeader(socket.handshake.headers.cookie);
      token = parsedCookies.token;
    }

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    const user = await User.findById(decoded.userId);

    if (!user) {
      return next(new Error('User not found'));
    }

    socket.data.user = user;
    socket.data.userId = user._id.toString();
    socket.data.coupleId = user.coupleId ? user.coupleId.toString() : null;

    next();
  } catch (err) {
    next(new Error('Invalid or expired socket authentication token'));
  }
}
