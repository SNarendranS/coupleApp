import { z } from 'zod';

// Auth Schemas
export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .transform((val) => val.toLowerCase().trim()),
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(100, 'Email cannot exceed 100 characters')
    .transform((val) => val.toLowerCase().trim()),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password is too long'),
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name cannot exceed 50 characters')
    .trim(),
  avatarUrl: z.string().url('Invalid avatar URL').optional().or(z.literal('')),
  bio: z.string().max(200, 'Bio cannot exceed 200 characters').optional().or(z.literal('')),
});

export const loginSchema = z.object({
  login: z
    .string()
    .min(1, 'Please enter your username or email')
    .transform((val) => val.toLowerCase().trim()),
  password: z.string().min(1, 'Please enter your password'),
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(50).trim().optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  bio: z.string().max(200).optional().or(z.literal('')),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

// Partner Schemas
export const partnerRequestSchema = z.object({
  receiverId: z.string().min(1, 'Receiver ID is required'),
});

export const coupleSettingsSchema = z.object({
  name: z.string().min(1).max(50).trim().optional(),
  relationshipStartDate: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  coverImage: z.string().url().optional().or(z.literal('')),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  avatarPublicId: z.string().optional().or(z.literal('')),
});

// Drawing Schemas
export const drawingStrokeSchema = z.object({
  strokeId: z.string().uuid(),
  tool: z.enum(['pen', 'pencil', 'marker', 'eraser']),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color'),
  width: z.number().min(1).max(50),
  points: z.array(
    z.object({
      x: z.number(),
      y: z.number(),
      p: z.number().optional(),
    })
  ).min(1),
});

// Game Schemas
export const gameMoveSchema = z.object({
  gameId: z.string().min(1),
  move: z.object({
    cellIndex: z.number().int().min(0).max(8).optional(),
    calledNumber: z.number().int().min(1).max(25).optional(),
    target: z
      .object({
        row: z.number().int().min(0).max(9),
        col: z.number().int().min(0).max(9),
      })
      .optional(),
    from: z
      .object({
        row: z.number().int().min(0).max(7),
        col: z.number().int().min(0).max(7),
      })
      .optional(),
    to: z
      .object({
        row: z.number().int().min(0).max(7),
        col: z.number().int().min(0).max(7),
      })
      .optional(),
  }),
});

export const bingoSetupSchema = z.object({
  fillMode: z.enum(['manual', 'timed', 'automatic']).default('automatic'),
  timeLimitSeconds: z.number().int().min(10).max(300).optional().default(30),
});

export const bingoSubmitBoardSchema = z.object({
  gameId: z.string().min(1),
  board: z.array(z.array(z.number().int().min(1).max(25)).length(5)).length(5),
});

export const shipPlacementSchema = z.object({
  type: z.enum(['carrier', 'battleship', 'cruiser', 'submarine', 'destroyer']),
  size: z.number().int().min(2).max(5),
  row: z.number().int().min(0).max(9),
  col: z.number().int().min(0).max(9),
  isVertical: z.boolean(),
  hits: z.number().int().min(0).default(0),
  isSunk: z.boolean().default(false),
});

export const battleshipPlaceShipsSchema = z.object({
  gameId: z.string().min(1),
  fleet: z.array(shipPlacementSchema).min(4).max(5),
});

export const battleshipFireSchema = z.object({
  gameId: z.string().min(1),
  target: z.object({
    row: z.number().int().min(0).max(9),
    col: z.number().int().min(0).max(9),
  }),
});

export const checkersMoveSchema = z.object({
  gameId: z.string().min(1),
  from: z.object({
    row: z.number().int().min(0).max(7),
    col: z.number().int().min(0).max(7),
  }),
  to: z.object({
    row: z.number().int().min(0).max(7),
    col: z.number().int().min(0).max(7),
  }),
});

export const gameRestartSchema = z.object({
  gameId: z.string().min(1),
});

// Calendar Schemas
export const calendarCategorySchema = z.enum(['plan', 'milestone', 'memory', 'reminder']);

export const eventRecurrenceSchema = z.object({
  frequency: z.enum(['none', 'weekly', 'monthly', 'yearly']).default('none'),
  interval: z.number().int().min(1).max(100).default(1),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional().or(z.literal('')),
});

export const eventReminderSchema = z.object({
  id: z.string().optional(),
  minutesBefore: z.number().int().min(0).max(10080),
  scheduledFor: z.string().optional(),
  isProcessed: z.boolean().default(false),
  notifyPartner: z.boolean().default(true),
});

export const eventCountdownSchema = z.object({
  enabled: z.boolean().default(false),
  isPrimary: z.boolean().default(false),
  customLabel: z.string().max(60).trim().optional().or(z.literal('')),
});

export const eventMilestoneSchema = z.object({
  isMilestone: z.boolean().default(false),
  milestoneType: z
    .enum(['anniversary', 'first_date', 'first_meeting', 'engagement', 'birthday', 'custom'])
    .optional(),
  showOnHome: z.boolean().default(false),
});

export const calendarEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100).trim(),
  description: z.string().max(500).trim().optional().or(z.literal('')),
  notes: z.string().max(1000).trim().optional().or(z.literal('')),

  // Date and Time (supporting startDate with fallback to legacy date)
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional().or(z.literal('')),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)').optional().or(z.literal('')),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)').optional().or(z.literal('')),
  allDay: z.boolean().default(true),

  // Categories
  eventTypes: z.array(calendarCategorySchema).optional(),
  type: z.enum(['memory', 'anniversary', 'plan', 'date_night', 'birthday']).optional(), // legacy

  location: z.string().max(100).optional().or(z.literal('')),
  imageUrl: z.string().url().optional().or(z.literal('')),
  imagePublicId: z.string().optional().or(z.literal('')),

  // Feature extensions
  recurrence: eventRecurrenceSchema.optional(),
  reminders: z.array(eventReminderSchema).optional().default([]),
  countdown: eventCountdownSchema.optional(),
  milestone: eventMilestoneSchema.optional(),
  linkedMemoryIds: z.array(z.string()).optional().default([]),

  // Legacy
  reminderMinutes: z.number().int().min(0).max(10080).optional(),
  isRecurringYearly: z.boolean().optional(),
}).refine((data) => !!(data.startDate || data.date), {
  message: 'Event start date is required',
  path: ['startDate'],
});

export const linkMemoryToEventSchema = z.object({
  memoryId: z.string().min(1, 'Memory ID is required'),
});

// Shared Link Schemas
export const sharedLinkSchema = z.object({
  url: z
    .string()
    .url('Please enter a valid URL')
    .refine((val) => /^https?:\/\//i.test(val), {
      message: 'Only HTTP and HTTPS links are allowed',
    }),
  title: z.string().min(1, 'Title is required').max(100).trim(),
  description: z.string().max(300).trim().optional().or(z.literal('')),
  thumbnail: z.string().url().optional().or(z.literal('')),
  category: z.enum(['food', 'travel', 'movies', 'shopping', 'music', 'other']),
});

// Memory Schemas
export const memorySchema = z.object({
  title: z.string().min(1, 'Title is required').max(100).trim(),
  description: z.string().max(1000).trim().optional().or(z.literal('')),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  imageUrls: z.array(z.string().url()).default([]),
  location: z.string().max(100).optional().or(z.literal('')),
  tags: z.array(z.string().max(30)).optional().default([]),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CalendarEventInput = z.infer<typeof calendarEventSchema>;
export type SharedLinkInput = z.infer<typeof sharedLinkSchema>;
export type MemoryInput = z.infer<typeof memorySchema>;
export type DrawingStrokeInput = z.infer<typeof drawingStrokeSchema>;
export type GameMoveInput = z.infer<typeof gameMoveSchema>;
export type BingoSetupInput = z.infer<typeof bingoSetupSchema>;
export type BingoSubmitBoardInput = z.infer<typeof bingoSubmitBoardSchema>;
export type GameRestartInput = z.infer<typeof gameRestartSchema>;
export type ShipPlacementInput = z.infer<typeof shipPlacementSchema>;
export type BattleshipPlaceShipsInput = z.infer<typeof battleshipPlaceShipsSchema>;
export type BattleshipFireInput = z.infer<typeof battleshipFireSchema>;
export type CheckersMoveInput = z.infer<typeof checkersMoveSchema>;
