import { Schema, model } from 'mongoose';
import { IPayment } from './payment.interface';

const paymentSchema = new Schema<IPayment>(
  {
    payment_method: {
      type: String,
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    driver: {
      type: Schema.Types.ObjectId,
      ref: 'Driver',
    },
    trip_id: {
      type: Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    order_id: {
      type: String,
      required: true,
    },
    transaction_id: {
      type: String,
      required: true,
    },
    note: String,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  },
);

export const Payment = model('Payment', paymentSchema);
