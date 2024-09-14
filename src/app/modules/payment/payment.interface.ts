import { Schema } from 'mongoose';

export type IPayment = {
  payment_method: string;
  user: Schema.Types.ObjectId;
  trip_id: Schema.Types.ObjectId;
  amount: number;
  transaction_id: string;
  note?: string;
  driver: Schema.Types.ObjectId;
  order_id: string;
};

export type Payload = {
  amount: number; // Changed to number for better type safety
};

export type PurchaseUnit = {
  items: {
    name: string;
    description: string;
    quantity: number;
    unit_amount: {
      currency_code: string;
      value: string;
    };
  }[];
  amount: {
    currency_code: string;
    value: string;
    breakdown: {
      item_total: {
        currency_code: string;
        value: string;
      };
    };
  };
};

export type ApplicationContext = {
  return_url: string;
  cancel_url: string;
  shipping_preference: string;
  user_action: string;
  brand_name: string;
};

export type MakePaymentIntentResponse = {
  links: { rel: string; href: string }[];
};
