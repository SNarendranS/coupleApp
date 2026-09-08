import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISharedLink extends Document {
  _id: Types.ObjectId;
  coupleId: Types.ObjectId;
  createdBy: Types.ObjectId;
  url: string;
  title: string;
  description?: string;
  thumbnail?: string;
  category: 'food' | 'travel' | 'movies' | 'shopping' | 'music' | 'other';
  createdAt: Date;
  updatedAt: Date;
}

const SharedLinkSchema = new Schema<ISharedLink>(
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
    url: {
      type: String,
      required: true,
      trim: true,
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
    thumbnail: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      enum: ['food', 'travel', 'movies', 'shopping', 'music', 'other'],
      default: 'other',
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

SharedLinkSchema.index({ coupleId: 1, createdAt: -1 });

export const SharedLink = mongoose.model<ISharedLink>('SharedLink', SharedLinkSchema);
