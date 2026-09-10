import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IGame extends Document {
  _id: Types.ObjectId;
  coupleId: Types.ObjectId;
  type: 'xo' | 'bingo';
  status: 'setup' | 'waiting' | 'in_progress' | 'finished' | 'draw' | 'cancelled';
  config?: Record<string, any>;
  state: Record<string, any>;
  winner?: Types.ObjectId | null;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  finishedAt?: Date;
}

const GameSchema = new Schema<IGame>(
  {
    coupleId: {
      type: Schema.Types.ObjectId,
      ref: 'Couple',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['xo', 'bingo'],
      required: true,
    },
    status: {
      type: String,
      enum: ['setup', 'waiting', 'in_progress', 'finished', 'draw', 'cancelled'],
      default: 'in_progress',
    },
    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
    state: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    winner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    finishedAt: {
      type: Date,
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

GameSchema.index({ coupleId: 1, type: 1, status: 1 });
GameSchema.index({ coupleId: 1, createdAt: -1 });

export const Game = mongoose.model<IGame>('Game', GameSchema);
