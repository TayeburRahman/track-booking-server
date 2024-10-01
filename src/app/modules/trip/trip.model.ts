import mongoose, { Schema } from 'mongoose';
import { IExtra, ITrip } from './trip.interface';

const extra = new Schema<IExtra>({
  image: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
});

const TripSchema = new mongoose.Schema<ITrip>(
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
    pickup: {
      type: String,
    },
    from: {
      type: String,
      required: true,
    },
    to: {
      type: String,
      required: true,
    },
    tripType: {
      type: String,
      enum: ['single', 'round', 'alDay'],
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    distance: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    fee: {
      type: Number,
      required: true,
    },
    order_id: {
      type: String,
    },
    transfer_amount: {
      type: Number,
    },
    extraCost: {
      type: extra,
    },
    payment: {
      type: String,
      enum: ['pending', 'complete'],
      default: 'pending',
    },
    acceptStatus: {
      type: String,
      enum: ['pending', 'accepted', 'end', 'cancel'],
      default: 'pending',
    },
  },
  { timestamps: true },
);

const Trip = mongoose.model('Trip', TripSchema);

export default Trip;
