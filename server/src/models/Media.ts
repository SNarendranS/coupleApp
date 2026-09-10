import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMedia extends Document {
  _id: Types.ObjectId;
  coupleId: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  category: 'couple_avatar' | 'event' | 'memory';
  provider: 'cloudinary' | 'local';
  publicId: string;
  url: string;
  thumbnailUrl?: string;
  mimeType: string;
  bytes: number;
  width?: number;
  height?: number;
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema<IMedia>(
  {
    coupleId: {
      type: Schema.Types.ObjectId,
      ref: 'Couple',
      required: true,
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      enum: ['couple_avatar', 'event', 'memory'],
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['cloudinary', 'local'],
      required: true,
    },
    publicId: {
      type: String,
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
      default: '',
    },
    mimeType: {
      type: String,
      required: true,
    },
    bytes: {
      type: Number,
      required: true,
    },
    width: {
      type: Number,
      default: null,
    },
    height: {
      type: Number,
      default: null,
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

MediaSchema.index({ coupleId: 1, category: 1, createdAt: -1 });

export const Media = mongoose.model<IMedia>('Media', MediaSchema);
