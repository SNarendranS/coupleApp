import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICouple extends Document {
  _id: Types.ObjectId;
  memberIds: [Types.ObjectId, Types.ObjectId];
  name?: string;
  relationshipStartDate?: Date;
  coverImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CoupleSchema = new Schema<ICouple>(
  {
    memberIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      validate: {
        validator: function (val: Types.ObjectId[]) {
          return Array.isArray(val) && val.length === 2;
        },
        message: 'A couple must have exactly 2 members',
      },
      required: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    relationshipStartDate: {
      type: Date,
      default: null,
    },
    coverImage: {
      type: String,
      default: '',
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

export const Couple = mongoose.model<ICouple>('Couple', CoupleSchema);
