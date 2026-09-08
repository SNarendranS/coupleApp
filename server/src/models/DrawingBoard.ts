import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IDrawingBoard extends Document {
  _id: Types.ObjectId;
  coupleId: Types.ObjectId;
  version: number;
  backgroundColor: '#ffffff' | '#121214';
  createdAt: Date;
  updatedAt: Date;
}

const DrawingBoardSchema = new Schema<IDrawingBoard>(
  {
    coupleId: {
      type: Schema.Types.ObjectId,
      ref: 'Couple',
      required: true,
      unique: true,
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    backgroundColor: {
      type: String,
      enum: ['#ffffff', '#121214'],
      default: '#ffffff',
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

export const DrawingBoard = mongoose.model<IDrawingBoard>('DrawingBoard', DrawingBoardSchema);
