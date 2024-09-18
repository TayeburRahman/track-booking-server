import { model, Schema } from 'mongoose';
import { IRatting } from './ratting.validation';

const rattingSchema = new Schema<IRatting>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    driver: {
      type: Schema.Types.ObjectId,
      ref: 'Driver',
      required: true,
    },
    comment: {
      type: String,
    },
    ratting: {
      type: Number,
      required: true,
    },
    trip: {
      type: Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Ratting = model('Ratting', rattingSchema);
