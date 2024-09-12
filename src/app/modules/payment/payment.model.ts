import { Schema, model } from 'mongoose';
import { IPayment } from './payment.interface';

const paymentSchema = new Schema<IPayment>(
  {
    payment_method: String,
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
    },
    amount: Number,
    transaction_id: String,
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
