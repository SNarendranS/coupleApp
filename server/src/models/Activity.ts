import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IActivity extends Document {
  _id: Types.ObjectId;
  coupleId: Types.ObjectId;
  userId: Types.ObjectId;
  action: string;
  details?: string;
  createdAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    coupleId: {
      type: Schema.Types.ObjectId,
      ref: 'Couple',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    details: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

ActivitySchema.index({ coupleId: 1, createdAt: -1 });

export const Activity = mongoose.model<IActivity>('Activity', ActivitySchema);
