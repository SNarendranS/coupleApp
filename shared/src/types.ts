export interface UserDTO {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  coupleId?: string | null;
  lastSeenAt?: string;
  isOnline?: boolean;
  createdAt: string;
}

export interface PartnerProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  isPartnered: boolean;
}

export interface CoupleDTO {
  id: string;
  members: [UserDTO, UserDTO] | UserDTO[];
  name?: string;
  relationshipStartDate?: string;
  coverImage?: string;
  avatarUrl?: string;
  avatarPublicId?: string;
  createdAt: string;
  updatedAt: string;
}

export type PartnerRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface PartnerRequestDTO {
  id: string;
  sender: UserDTO;
  receiver: UserDTO;
  status: PartnerRequestStatus;
  createdAt: string;
  updatedAt: string;
}

// Drawing types
export type DrawingTool = 'pen' | 'pencil' | 'marker' | 'eraser';

export interface Point {
  x: number;
  y: number;
  p?: number; // pressure
}

export interface DrawingStrokeDTO {
  id: string;
  strokeId: string;
  coupleId: string;
  createdBy: string;
  tool: DrawingTool;
  color: string;
  width: number;
  points: Point[];
  createdAt: string;
}

export interface DrawingBoardDTO {
  id: string;
  coupleId: string;
  version: number;
  backgroundColor: '#ffffff' | '#121214';
  strokes: DrawingStrokeDTO[];
  updatedAt: string;
}

// Game types
export type GameType = 'xo' | 'bingo';
export type GameStatus = 'setup' | 'waiting' | 'in_progress' | 'finished' | 'draw' | 'cancelled';

export type BingoFillMode = 'manual' | 'timed' | 'automatic';

export interface BingoConfig {
  fillMode: BingoFillMode;
  timeLimitSeconds?: number;
  setupStartedAt?: string;
}

export interface XOGameState {
  board: (string | null)[]; // 9 items: 'X', 'O', or null
  playerX: string; // userId
  playerO: string; // userId
  currentTurn: string; // userId
  winningLine: number[] | null;
  winner: string | null; // userId or null
  movesCount?: number;
}

export interface BingoGameState {
  players: string[]; // [userA, userB]
  playerBoards: Record<string, (number | null)[][]>; // 5x5 matrix
  calledNumbers: number[];
  playerLinesCompleted: Record<string, number>; // count of completed 5-in-a-row lines
  currentTurn: string; // userId
  winner: string | null;
  winningLines?: Record<string, number[][]>; // lines completed per player
  readyPlayers?: string[]; // userIds of players ready
}

export interface GameDTO {
  id: string;
  coupleId: string;
  type: GameType;
  status: GameStatus;
  config?: BingoConfig;
  state: XOGameState | BingoGameState;
  winner?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  finishedAt?: string;
}

// Media types
export type MediaCategory = 'couple_avatar' | 'event' | 'memory';

export interface MediaDTO {
  id: string;
  coupleId: string;
  uploadedBy: string;
  category: MediaCategory;
  provider: 'cloudinary' | 'local';
  publicId: string;
  url: string;
  thumbnailUrl?: string;
  mimeType: string;
  bytes: number;
  width?: number;
  height?: number;
  createdAt: string;
}

// Calendar types
export type CalendarEventType = 'memory' | 'anniversary' | 'plan' | 'date_night' | 'birthday';

export interface CalendarEventDTO {
  id: string;
  coupleId: string;
  createdBy: string;
  title: string;
  description?: string;
  date: string; // ISO date string YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  allDay: boolean;
  type: CalendarEventType;
  location?: string;
  imageUrl?: string;
  imagePublicId?: string;
  reminderMinutes?: number;
  isRecurringYearly?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Shared Links types
export type LinkCategory = 'food' | 'travel' | 'movies' | 'shopping' | 'music' | 'other';

export interface SharedLinkDTO {
  id: string;
  coupleId: string;
  createdBy: string;
  creatorName?: string;
  url: string;
  title: string;
  description?: string;
  thumbnail?: string;
  category: LinkCategory;
  createdAt: string;
  updatedAt: string;
}

// Memory types
export interface MemoryDTO {
  id: string;
  coupleId: string;
  createdBy: string;
  creatorName?: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  imageUrls: string[];
  location?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// Notification types
export type NotificationType =
  | 'partner_request'
  | 'partner_accepted'
  | 'partner_rejected'
  | 'partner_online'
  | 'calendar_reminder'
  | 'calendar_new'
  | 'game_invite'
  | 'game_finished'
  | 'drawing_activity'
  | 'link_new'
  | 'memory_new';

export interface NotificationDTO {
  id: string;
  userId: string;
  coupleId?: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// Activity types
export interface ActivityDTO {
  id: string;
  coupleId: string;
  userId: string;
  userName: string;
  action: string;
  details?: string;
  icon?: string;
  createdAt: string;
}

// Presence
export interface PresenceState {
  userId: string;
  isOnline: boolean;
  lastSeenAt: string;
  currentActivity?: string; // e.g., 'Drawing on Canvas', 'Playing XO', 'Browsing Calendar'
}

// Standard API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
