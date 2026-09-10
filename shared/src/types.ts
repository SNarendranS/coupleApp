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
export type GameType = 'xo' | 'bingo' | 'battleship' | 'checkers';
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

// Battleship Types
export type ShipType = 'carrier' | 'battleship' | 'cruiser' | 'submarine' | 'destroyer';

export interface ShipPlacement {
  type: ShipType;
  size: number;
  row: number; // 0-9
  col: number; // 0-9
  isVertical: boolean;
  hits: number;
  isSunk: boolean;
}

export interface BattleshipBoardConfig {
  boardSize?: '10x10' | '8x8';
  fleet?: 'classic' | 'small';
  turnTimeLimitSeconds?: number;
  firstPlayer?: 'host' | 'challenger' | 'random';
}

export interface BattleshipShot {
  row: number;
  col: number;
  result: 'hit' | 'miss' | 'sunk';
  shipType?: ShipType; // STRICTLY present only when result is 'sunk'
  timestamp: string;
}

export interface BattleshipPlayerStats {
  shots: number;
  hits: number;
  misses: number;
  shipsSunk: number;
}

export interface BattleshipPublicState {
  players: [string, string];
  currentTurn: string;
  shots: Record<string, BattleshipShot[]>; // userId -> shots fired by this user
  readyPlayers: string[];
  winner: string | null;
  turnStartedAt?: string;
  stats: Record<string, BattleshipPlayerStats>;
}

export interface BattleshipPrivatePlayerState {
  fleet: ShipPlacement[];
}

export interface BattleshipClientGameState extends BattleshipPublicState {
  myFleet: ShipPlacement[];
  opponentFleet?: ShipPlacement[] | null; // ONLY populated when status === 'finished'
}

// Checkers Types
export interface CheckersPiece {
  id: string;
  player: string; // userId
  row: number; // 0-7
  col: number; // 0-7
  isKing: boolean;
}

export interface CheckersConfig {
  turnTimeLimitSeconds?: number;
  firstPlayer?: 'host' | 'challenger' | 'random';
}

export interface CheckersMove {
  from: { row: number; col: number };
  to: { row: number; col: number };
  capturedPieceId?: string;
}

export interface CheckersGameState {
  players: [string, string];
  pieces: CheckersPiece[];
  currentTurn: string; // userId
  winner: string | null;
  activePieceId?: string | null; // locked piece during multi-jump
  consecutiveJumps: boolean;
  movesCount: number;
  captures: Record<string, number>; // userId -> capture count
  turnStartedAt?: string;
}

export interface GameDTO {
  id: string;
  coupleId: string;
  type: GameType;
  status: GameStatus;
  config?: BingoConfig | BattleshipBoardConfig | CheckersConfig | Record<string, any>;
  state: XOGameState | BingoGameState | BattleshipClientGameState | CheckersGameState | any;
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

export type CalendarCategory = 'plan' | 'milestone' | 'memory' | 'reminder';

export type EventRecurrenceFrequency = 'none' | 'weekly' | 'monthly' | 'yearly';

export interface EventRecurrence {
  frequency: EventRecurrenceFrequency;
  interval: number;
  endDate?: string;
}

export interface EventReminder {
  id: string;
  minutesBefore: number;
  scheduledFor: string; // ISO string
  isProcessed: boolean;
  notifyPartner: boolean;
}

export interface EventCountdown {
  enabled: boolean;
  isPrimary?: boolean;
  customLabel?: string;
}

export type MilestoneType =
  | 'anniversary'
  | 'first_date'
  | 'first_meeting'
  | 'engagement'
  | 'birthday'
  | 'custom';

export interface EventMilestone {
  isMilestone: boolean;
  milestoneType?: MilestoneType;
  showOnHome?: boolean;
}

export interface LinkedMemorySummary {
  id: string;
  title: string;
  date: string;
  imageUrls: string[];
  location?: string;
}

export interface CalendarEventDTO {
  id: string;
  coupleId: string;
  createdBy: string;
  title: string;
  description?: string;
  notes?: string;

  // Categories & multi-property support
  eventTypes: CalendarCategory[];
  type?: CalendarEventType; // legacy single type compatibility

  // Date & Time
  startDate: string; // YYYY-MM-DD
  date?: string; // legacy alias
  endDate?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  allDay: boolean;

  location?: string;
  imageUrl?: string;
  imagePublicId?: string;

  // Rich features
  recurrence?: EventRecurrence;
  reminders?: EventReminder[];
  countdown?: EventCountdown;
  milestone?: EventMilestone;
  linkedMemoryIds?: string[];
  linkedMoments?: LinkedMemorySummary[];

  // Legacy fields
  reminderMinutes?: number;
  isRecurringYearly?: boolean;

  createdAt: string;
  updatedAt: string;
}

// Countdown item DTO (derived dynamically)
export interface CountdownItemDTO {
  eventId: string;
  title: string;
  targetDate: string;
  targetTime?: string;
  targetTimestamp: string;
  daysRemaining: number;
  hoursRemaining: number;
  status: 'upcoming' | 'today' | 'passed';
  isPrimary: boolean;
  customLabel?: string;
  category: CalendarCategory;
  milestoneType?: MilestoneType;
}

// Our Story (Timeline) DTO (derived dynamically)
export interface OurStoryItemDTO {
  id: string;
  sourceType: 'calendar_event' | 'memory';
  title: string;
  date: string; // YYYY-MM-DD
  year: number;
  month: number; // 1-12
  description?: string;
  location?: string;
  categories: CalendarCategory[];
  milestoneType?: MilestoneType;
  photos: string[];
  linkedMemoryCount: number;
  calendarEventId?: string;
  memoryId?: string;
  createdAt: string;
}

export interface OurStoryTimelineMonthGroup {
  month: number;
  monthName: string;
  items: OurStoryItemDTO[];
}

export interface OurStoryTimelineYearGroup {
  year: number;
  months: OurStoryTimelineMonthGroup[];
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
