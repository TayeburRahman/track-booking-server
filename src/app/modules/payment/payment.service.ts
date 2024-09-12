import Stripe from 'stripe';
import config from '../../../config';
import ApiError from '../../../errors/ApiError';
import httpStatus from 'http-status';
import { Payment } from './payment.model';
import { paypalTokenGenerator } from './paypal.token';
import axios from 'axios';
const paypal = require('@paypal/checkout-server-sdk');
const { client } = require('./paypal.client');

const stripe = new Stripe(
  'sk_test_51L0k3pBXb2oMSwoOOFy5628JpwJdNvtEhCP9hO3K2TqlVjPcH7iv15BhLwIiFjxi4XiUCHApCK2U7Gts9KnVpy1K00hxRiASsW' as string,
);

// const makePaymentIntent = async (payload: { price: any }) => {
//   const amount = Math.trunc(payload.price * 100);

//   // console.log("req", req.body)

//   const paymentIntent = await stripe.paymentIntents.create({
//     amount,
//     currency: 'usd',
//     payment_method_types: ['card'],
//   });

//   const data = {
//     client_secret: paymentIntent.client_secret,
//     transactionId: paymentIntent.id,
//   };
//   return data;
// };

const makePaymentIntent = async (payload: { price: any }) => {
  // const amount = payload.price as any;
  // if (!amount || Number(amount) <= 0) {
  //   throw new ApiError(
  //     httpStatus.PAYMENT_REQUIRED,
  //     'Invalid amount. Amount should be a positive number.',
  //   );
  // }
  // // const accessToken = await generateAccessToken();
  // const response: any = await axios({
  //   url: process.env.PAYPAL_BASE_URL + '/v2/checkout/orders',
  //   method: 'post',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     Authorization: 'Bearer ' + accessToken,
  //   },
  //   data: JSON.stringify({
  //     intent: 'CAPTURE',
  //     purchase_units: [
  //       {
  //         items: [
  //           {
  //             name: 'Node.js Complete Course',
  //             description: 'Node.js Complete Course with Express and MongoDB',
  //             quantity: 1,
  //             unit_amount: {
  //               currency_code: 'USD',
  //               value: '100.00',
  //             },
  //           },
  //         ],
  //         amount: {
  //           currency_code: 'USD',
  //           value: '100.00',
  //           breakdown: {
  //             item_total: {
  //               currency_code: 'USD',
  //               value: '100.00',
  //             },
  //           },
  //         },
  //       },
  //     ],
  //     application_context: {
  //       return_url: process.env.BASE_URL + '/complete-order',
  //       cancel_url: process.env.BASE_URL + '/cancel-order',
  //       shipping_preference: 'NO_SHIPPING',
  //       user_action: 'PAY_NOW',
  //       brand_name: 'manfra.io',
  //     },
  //   }),
  // });
  // return response.data.links.find(link => link.rel === 'approve').href;
};

const savePayment = async (payload: { price: any }) => {
  const { driverId, userId, trip_id, ...paymentData } = payload as {
    driverId?: string;
    [key: string]: any;
  };

  if (!driverId || !userId || !trip_id) {
    throw new ApiError(
      httpStatus.NOT_ACCEPTABLE,
      'Driver, user, and trip ID is required!.',
    );
  }

  // Create a new payment record
  const newPayment = new Payment(paymentData);

  // Update the appointment status
  // await Appointment.updateOne({ doctorId }, { status: 'completed' });

  // Save the payment record
  const result = await newPayment.save();
  return result;
};

export const PaymentService = { makePaymentIntent, savePayment };
