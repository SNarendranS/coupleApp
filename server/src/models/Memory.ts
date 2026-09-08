import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMemory extends Document {
  _id: Types.ObjectId;
  coupleId: Types.ObjectId;
  createdBy: Types.ObjectId;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  imageUrls: string[];
  location?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MemorySchema = new Schema<IMemory>(
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
    imageUrls: {
      type: [String],
      default: [],
    },
    location: {
      type: String,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
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

MemorySchema.index({ coupleId: 1, date: -1 });

export const Memory = mongoose.model<IMemory>('Memory', MemorySchema);
