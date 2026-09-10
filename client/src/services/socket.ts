import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@couple/shared';

class SocketService {
  private socket: Socket | null = null;
  private connected: boolean = false;

  connect(): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const token = localStorage.getItem('token');
    const socketUrl = (import.meta.env.VITE_SOCKET_URL as string) || undefined;
    const socketEndpoint = socketUrl && socketUrl !== '/' ? socketUrl : undefined;

    this.socket = socketEndpoint
      ? io(socketEndpoint, {
          path: '/socket.io',
          auth: { token },
          withCredentials: true,
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
        })
      : io({
          path: '/socket.io',
          auth: { token },
          withCredentials: true,
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
        });

    this.socket.on(SOCKET_EVENTS.CONNECT, () => {
      this.connected = true;
      console.log('Connected to UsTwo Realtime Socket Server');
    });

    this.socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      this.connected = false;
      console.log('Disconnected from Socket Server:', reason);
    });

    this.socket.on(SOCKET_EVENTS.ERROR, (err) => {
      console.error('Socket error:', err);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.connected;
  }

  emit(event: string, data?: any, callback?: Function) {
    if (this.socket) {
      this.socket.emit(event, data, callback);
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export const socketService = new SocketService();
