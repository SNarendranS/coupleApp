import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IDrawingStroke extends Document {
  _id: Types.ObjectId;
  coupleId: Types.ObjectId;
  strokeId: string;
  createdBy: Types.ObjectId;
  tool: 'pen' | 'pencil' | 'marker' | 'eraser';
  color: string;
  width: number;
  points: { x: number; y: number; p?: number }[];
  createdAt: Date;
}

const DrawingStrokeSchema = new Schema<IDrawingStroke>(
  {
    coupleId: {
      type: Schema.Types.ObjectId,
      ref: 'Couple',
      required: true,
      index: true,
    },
    strokeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tool: {
      type: String,
      enum: ['pen', 'pencil', 'marker', 'eraser'],
      default: 'pen',
    },
    color: {
      type: String,
      required: true,
    },
    width: {
      type: Number,
      required: true,
    },
    points: [
      {
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        p: { type: Number },
      },
    ],
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

DrawingStrokeSchema.index({ coupleId: 1, createdAt: 1 });

export const DrawingStroke = mongoose.model<IDrawingStroke>('DrawingStroke', DrawingStrokeSchema);
