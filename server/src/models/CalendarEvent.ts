import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICalendarEvent extends Document {
  _id: Types.ObjectId;
  coupleId: Types.ObjectId;
  createdBy: Types.ObjectId;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  type: 'memory' | 'anniversary' | 'plan' | 'date_night' | 'birthday';
  location?: string;
  imageUrl?: string;
  imagePublicId?: string;
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
    date: {
      type: String,
      required: true,
      index: true,
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
    type: {
      type: String,
      enum: ['memory', 'anniversary', 'plan', 'date_night', 'birthday'],
      default: 'plan',
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
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

CalendarEventSchema.index({ coupleId: 1, date: 1 });

export const CalendarEvent = mongoose.model<ICalendarEvent>('CalendarEvent', CalendarEventSchema);
