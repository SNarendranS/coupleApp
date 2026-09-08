import {
  DrawingStrokeDTO,
  GameDTO,
  CalendarEventDTO,
  SharedLinkDTO,
  MemoryDTO,
  NotificationDTO,
  PresenceState,
  ActivityDTO,
} from './types';

export const SOCKET_EVENTS = {
  // Connection & Room
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  RECONNECT: 'reconnect',
  ERROR: 'error',

  // Presence
  PRESENCE_UPDATE: 'presence:update',
  PRESENCE_ACTIVITY: 'presence:activity',
  PRESENCE_QUERY: 'presence:query',

  // Drawing
  DRAWING_STROKE_STREAM: 'drawing:stroke-stream', // In-progress line streaming
  DRAWING_STROKE_COMMIT: 'drawing:stroke-commit', // Finished stroke
  DRAWING_CLEAR: 'drawing:clear',
  DRAWING_BACKGROUND: 'drawing:background',
  DRAWING_UNDO: 'drawing:undo',
  DRAWING_SYNC_REQUEST: 'drawing:sync-request',
  DRAWING_SYNC_RESPONSE: 'drawing:sync-response',

  // Games
  GAME_CREATE: 'game:create',
  GAME_JOIN: 'game:join',
  GAME_MOVE: 'game:move',
  GAME_STATE: 'game:state',
  GAME_RESTART: 'game:restart',
  GAME_FINISHED: 'game:finished',

  // Calendar
  CALENDAR_EVENT_CREATED: 'calendar:event-created',
  CALENDAR_EVENT_UPDATED: 'calendar:event-updated',
  CALENDAR_EVENT_DELETED: 'calendar:event-deleted',

  // Links
  LINK_CREATED: 'link:created',
  LINK_UPDATED: 'link:updated',
  LINK_DELETED: 'link:deleted',

  // Memories
  MEMORY_CREATED: 'memory:created',
  MEMORY_UPDATED: 'memory:updated',
  MEMORY_DELETED: 'memory:deleted',

  // Notifications
  NOTIFICATION_NEW: 'notification:new',

  // Activity Feed
  ACTIVITY_NEW: 'activity:new',

  // Partner updates
  PARTNER_CONNECTED: 'partner:connected',
  PARTNER_DISCONNECTED: 'partner:disconnected',
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

export interface SocketEnvelope<T = unknown> {
  eventId: string;
  timestamp: string;
  actorId: string;
  coupleId: string;
  payload: T;
}

export interface DrawingStrokeStreamPayload {
  strokeId: string;
  tool: string;
  color: string;
  width: number;
  point: { x: number; y: number; p?: number };
}

export interface DrawingStrokeCommitPayload {
  stroke: DrawingStrokeDTO;
}

export interface DrawingClearPayload {
  clearedBy: string;
}

export interface DrawingBackgroundPayload {
  backgroundColor: '#ffffff' | '#121214';
}

export interface DrawingUndoPayload {
  strokeId: string;
}

export interface GameMovePayload {
  gameId: string;
  move: {
    cellIndex?: number; // for XO: 0-8
    calledNumber?: number; // for Bingo: 1-25
  };
}

export interface PresenceUpdatePayload {
  userId: string;
  isOnline: boolean;
  lastSeenAt: string;
  currentActivity?: string;
}

export interface ActivityNewPayload {
  activity: ActivityDTO;
}
