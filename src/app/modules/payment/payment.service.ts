import Stripe from 'stripe';
import config from '../../../config';
import ApiError from '../../../errors/ApiError';
import httpStatus from 'http-status';
import { Payment } from './payment.model';
import { paypalTokenGenerator } from './paypal.token';
import axios from 'axios';
import { Request } from 'express';
import QueryBuilder from '../../../builder/QueryBuilder';
import {
  IPayment,
  MakePaymentIntentResponse,
  Payload,
} from './payment.interface';
import { IGenericResponse } from '../../../interfaces/paginations';
import Trip from '../trip/trip.model';
import Notification from '../notifications/notifications.model';
const paypal = require('@paypal/checkout-server-sdk');
const { client } = require('./paypal.client');

async function generateAccessToken(): Promise<string> {
  try {
    const response = await axios.post(
      `${process.env.PAYPAL_BASE_URL}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        auth: {
          username: process.env.PAYPAL_CLIENT_ID!,
          password: process.env.PAYPAL_SECRET!,
        },
      },
    );

    return response.data.access_token;
  } catch (error) {
    // console.error('Error generating access token:', error);
    throw new Error('Failed to generate access token');
  }
}

const getPayPalAccessToken = async (): Promise<string> => {
  const response = await axios.post(
    `${config.paypal.PAYPAL_BASE_URL}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      auth: {
        username: process.env.PAYPAL_CLIENT_ID!,
        password: process.env.PAYPAL_SECRET!,
      },
    },
  );

  // console.log(
  //   'response.data.access_token=====================',
  //   response.data.access_token,
  // );

  return response.data.access_token;
};

const makePaymentIntent = async (payload: Payload) => {
  // const accessToken = await generateAccessToken();
  // const amount = payload.amount;
  // console.log('accessToken', accessToken);
  // if (!amount || Number(amount) <= 0) {
  //   throw new ApiError(
  //     httpStatus.PAYMENT_REQUIRED,
  //     'Invalid amount. Amount should be a positive number.',
  //   );
  // }
  // const response = await axios({
  //   url: 'https://api-m.sandbox.paypal.com/v2/checkout/orders',
  //   method: 'post',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     Authorization: 'Bearer ' + accessToken,
  //   },
  //   data: JSON.stringify({
  //     intent: 'CAPTURE',
  //     purchase_units: [
  //       {
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
  //         items: [
  //           {
  //             name: 'Tripe of driver payment',
  //             description: 'Tripe of driver payment transaction',
  //             quantity: '1',
  //             unit_amount: {
  //               currency_code: 'USD',
  //               value: '100.00',
  //             },
  //           },
  //         ],
  //       },
  //     ],
  //     application_context: {
  //       return_url: 'http://localhost:3000/complete-order',
  //       cancel_url: 'http://localhost:3000/cancel-order',
  //       shipping_preference: 'NO_SHIPPING',
  //       user_action: 'PAY_NOW',
  //       brand_name: 'manfra.io',
  //     },
  //   }),
  // });
  // const data = response.data.links.find(link => link.rel === 'approve').href;
  // return data;
};

const saveTripPayment = async (payload: any) => {
  const { trip_id, order_id, ...paymentData } = payload;

  if (!order_id || !trip_id) {
    throw new ApiError(
      httpStatus.NOT_ACCEPTABLE,
      'OrderId and tripID are required!',
    );
  }

  const newPayment = new Payment({
    ...paymentData,
    trip_id,
    order_id,
  });
  const result = await newPayment.save();

  const updatedTrip = await Trip.findOneAndUpdate(
    { _id: trip_id },
    { order_id, payment: 'complete' },
    { new: true, upsert: false },
  );

  if (!updatedTrip) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Trip not found');
  }

  if (updatedTrip) {
    const userNotification = await Notification.create({
      title: 'Payment Successfully for trip',
      driver: updatedTrip.driver,
      user: updatedTrip.user,
      message:
        'Your payment has been successfully completed. Thank you for using our service.',
    });

    const driverNotification = await Notification.create({
      title: 'Payment Successfully for trip',
      driver: updatedTrip.driver,
      user: updatedTrip.user,
      message:
        'Your payment has been successfully completed. Thank you for your excellent service!',
    });

    //@ts-ignore
    if (global.io) {
      //@ts-ignore
      const socketIo = global.io;

      socketIo
        .to(updatedTrip.user.toString())
        .emit('notification', userNotification);
      socketIo
        .to(updatedTrip.driver.toString())
        .emit('notification', driverNotification);
    } else {
      console.error('Socket.IO is not initialized');
    }
  }

  return { paymentResult: result, updatedTrip };
};

// const capturePayment = async () => {
//   const accessToken = await generateAccessToken(); // Ensure this function works properly

//   const orderId = '8953883464625670D'; // Ensure this is a valid orderId from PayPal
//   try {
//     const response = await axios.post(
//       `https://api-m.sandbox.paypal.com/v2/checkout/orders/8953883464625670D/capture`,
//       {}, // No body needed for capturing payment
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           'Content-Type': 'application/json',
//         },
//       },
//     );

//     console.log('Payment captured successfully:', response.data);
//     return response.data;
//   } catch (error) {
//     if (error.response) {
//       // The request was made and the server responded with a status code that falls out of the range of 2xx
//       console.error('Error response data:', error.response.data);
//       console.error('Error response status:', error.response.status);
//       console.error('Error response headers:', error.response.headers);

//       // Detailed error logging for PayPal-specific issues
//       const { data } = error.response;
//       if (data && data.name === 'ORDER_NOT_APPROVED') {
//         console.error('Order not approved by the buyer.');
//       } else if (data && data.name === 'INVALID_RESOURCE_ID') {
//         console.error('Invalid order ID. Ensure the order ID exists.');
//       }
//     } else if (error.request) {
//       // The request was made but no response was received
//       console.error('Error request data:', error.request);
//     } else {
//       // Something happened in setting up the request that triggered an Error
//       console.error('Error message:', error.message);
//     }
//     throw error; // Rethrow error to be handled elsewhere
//   }
// };

const capturePayment = async (orderId: string) => {
  // const orderId = '8953883464625670D';
  const accessToken = await generateAccessToken();
  const response = await axios.get(
    `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  return response.data;
};

const transferPayment = async (data: any) => {
  const { amount, driverEmail } = data;
  const accessToken = await getPayPalAccessToken();

  console.log(
    'Payout to driver==============================================================',
    accessToken,
    driverEmail,
    amount,
  );

  const response = await axios.post(
    `${config.paypal.PAYPAL_BASE_URL}/v1/payments/payouts`,
    {
      sender_batch_header: {
        sender_batch_id: `batch-${Date.now()}`,
        email_subject: 'You have a payment',
        email_message:
          'You have received a payment. Thanks for using our service!',
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: {
            value: amount.toFixed(2),
            currency: 'USD',
          },
          receiver: driverEmail,
          note: 'Payment for your trip',
          sender_item_id: `item-${Date.now()}`,
        },
      ],
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return { batch_id: response.data.batch_header.payout_batch_id };
};

const createPayoutToDriver = async (payload: any) => {
  const { amount, driverEmail } = payload;
  const accessToken = await getPayPalAccessToken();

  console.log(
    'Payout to driver==============================================================',
    accessToken,
    driverEmail,
    amount,
  );

  const response = await axios.post(
    `${config.paypal.PAYPAL_BASE_URL}/v1/payments/payouts`,
    {
      sender_batch_header: {
        sender_batch_id: `batch-${Date.now()}`,
        email_subject: 'You have a payment',
        email_message:
          'You have received a payment. Thanks for using our service!',
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: {
            value: amount.toFixed(2),
            currency: 'USD',
          },
          receiver: driverEmail,
          note: 'Payment for your trip',
          sender_item_id: `item-${Date.now()}`,
        },
      ],
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  console.log('response', response.data);

  // console.log(
  //   'response==============================================================',
  //   response,
  // );

  return { batch_id: response.data.batch_header.payout_batch_id };
};

const getUserPayment = async (payload: any) => {
  const userId = payload.params.userId;

  const result = await Payment.find({ user: userId });

  return result;
};

const getAllPayment = async (
  query: Record<string, unknown>,
): Promise<IGenericResponse<IPayment[]>> => {
  console.log('query', query);
  console.log('hello ', query);
  const userQuery = new QueryBuilder(Payment.find(), query)
    .search(['name'])
    .filter()
    .sort()
    .paginate();

  const result = await userQuery.modelQuery;
  const meta = await userQuery.countTotal();

  console.log('result', result);

  return {
    meta,
    data: result,
  };
};

export const PaymentService = {
  makePaymentIntent,
  saveTripPayment,
  getUserPayment,
  getAllPayment,
  createPayoutToDriver,
  capturePayment,
  transferPayment,
};
