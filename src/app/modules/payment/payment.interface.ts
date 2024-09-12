import { Schema } from 'mongoose';

export type IPayment = {
  payment_method: string;
  user: Schema.Types.ObjectId;
  trip_id: Schema.Types.ObjectId;
  amount: number;
  transaction_id: string;
  note: string;
  driver: Schema.Types.ObjectId;
};
