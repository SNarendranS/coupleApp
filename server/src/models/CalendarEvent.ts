import mongoose, { Document, Schema, Types } from 'mongoose';
import {
  CalendarCategory,
  CalendarEventType,
  EventRecurrence,
  EventReminder,
  EventCountdown,
  EventMilestone,
} from '@couple/shared';

export interface ICalendarEvent extends Document {
  _id: Types.ObjectId;
  coupleId: Types.ObjectId;
  createdBy: Types.ObjectId;
  title: string;
  description?: string;
  notes?: string;

  // Multi-category relationship event model
  eventTypes: CalendarCategory[];
  type?: CalendarEventType; // legacy single type support

  // Date and Time
  startDate: string; // YYYY-MM-DD
  date: string; // legacy alias
  endDate?: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  allDay: boolean;

  location?: string;
  imageUrl?: string;
  imagePublicId?: string;

  // Features
  recurrence?: EventRecurrence;
  reminders?: EventReminder[];
  countdown?: EventCountdown;
  milestone?: EventMilestone;
  linkedMemoryIds?: Types.ObjectId[];

  // Legacy fields
  reminderMinutes?: number;
  isRecurringYearly: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const CalendarEventSchema = new Schema<ICalendarEvent>(
  {
    coupleId: {
      type: Schema.Types.ObjectId,
      ref: 'Couple',
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    eventTypes: {
      type: [String],
      enum: ['plan', 'milestone', 'memory', 'reminder'],
      default: undefined,
      index: true,
    },
    type: {
      type: String,
      enum: ['memory', 'anniversary', 'plan', 'date_night', 'birthday'],
      default: 'plan',
    },
    startDate: {
      type: String,
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      index: true,
    },
    endDate: {
      type: String,
      default: '',
    },
    startTime: {
      type: String,
      default: '',
    },
    endTime: {
      type: String,
      default: '',
    },
    allDay: {
      type: Boolean,
      default: true,
    },
    location: {
      type: String,
      default: '',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    imagePublicId: {
      type: String,
      default: '',
    },
    recurrence: {
      frequency: {
        type: String,
        enum: ['none', 'weekly', 'monthly', 'yearly'],
        default: 'none',
      },
      interval: {
        type: Number,
        default: 1,
      },
      endDate: {
        type: String,
        default: '',
      },
    },
    reminders: [
      {
        id: { type: String, required: true },
        minutesBefore: { type: Number, required: true },
        scheduledFor: { type: Date, required: true, index: true },
        isProcessed: { type: Boolean, default: false, index: true },
        notifyPartner: { type: Boolean, default: true },
      },
    ],
    countdown: {
      enabled: { type: Boolean, default: false, index: true },
      isPrimary: { type: Boolean, default: false },
      customLabel: { type: String, default: '' },
    },
    milestone: {
      isMilestone: { type: Boolean, default: false },
      milestoneType: {
        type: String,
        enum: ['anniversary', 'first_date', 'first_meeting', 'engagement', 'birthday', 'custom'],
        default: 'custom',
      },
      showOnHome: { type: Boolean, default: false },
    },
    linkedMemoryIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Memory',
      },
    ],
    reminderMinutes: {
      type: Number,
      default: 0,
    },
    isRecurringYearly: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id ? ret._id.toString() : undefined;
        ret.startDate = ret.startDate || ret.date;
        ret.date = ret.date || ret.startDate;
        if (!ret.eventTypes || ret.eventTypes.length === 0) {
          if (ret.type === 'anniversary' || ret.type === 'birthday') {
            ret.eventTypes = ['milestone'];
          } else if (ret.type === 'memory') {
            ret.eventTypes = ['memory'];
          } else {
            ret.eventTypes = ['plan'];
          }
        }
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Keep startDate and date in sync before validation
CalendarEventSchema.pre('validate', function (next) {
  if (!this.startDate && this.date) {
    this.startDate = this.date;
  }
  if (!this.date && this.startDate) {
    this.date = this.startDate;
  }
  if (!this.eventTypes || this.eventTypes.length === 0) {
    if (this.type === 'anniversary' || this.type === 'birthday') {
      this.eventTypes = ['milestone'];
    } else if (this.type === 'memory') {
      this.eventTypes = ['memory'];
    } else {
      this.eventTypes = ['plan'];
    }
  }
  next();
});

// Indexes for high performance querying
CalendarEventSchema.index({ coupleId: 1, startDate: 1 });
CalendarEventSchema.index({ coupleId: 1, date: 1 });
CalendarEventSchema.index({ coupleId: 1, 'countdown.enabled': 1 });
CalendarEventSchema.index({ 'reminders.scheduledFor': 1, 'reminders.isProcessed': 1 });

export const CalendarEvent = mongoose.model<ICalendarEvent>('CalendarEvent', CalendarEventSchema);
