/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Request } from 'express';
import { IReqUser } from '../user/user.interface';
import { ITrip } from './trip.interface';
import User from '../user/user.model';
import ApiError from '../../../errors/ApiError';
import httpStatus from 'http-status';
import Trip from './trip.model';
import Driver from '../driver/driver.model';
import Notification from '../notifications/notifications.model';
import { Ratting } from '../rattings/rattings.model';
import { PaymentService } from '../payment/payment.service';
import { IDriver } from '../driver/driver.interface';
// const http = require('http');
// const express = require('express');
// const socketIo = require('socket.io');
// const app = express();
// const server = http.createServer(app);
// const io = socketIo(server);

const insertIntoDB = async (req: Request) => {
  const { userId } = req.user as IReqUser;
  const tripData = req.body as ITrip;

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const newTrip = await Trip.create({
    ...tripData,
    user: userId,
  });

  if (newTrip) {
    const userNotification = await Notification.create({
      title: 'New Trip Request Sent',
      driver: tripData.driver,
      user: userId,
      message: 'You have successfully sent a new trip request!',
    });

    const driverNotification = await Notification.create({
      title: 'New Trip Request!',
      driver: tripData.driver,
      user: userId,
      message: `You have a new trip request from ${tripData.pickup} to ${tripData.to}.`,
    });
    //@ts-ignore
    if (global.io) {
      //@ts-ignore
      const socketIo = global.io;

      socketIo.to(userId.toString()).emit('notification', userNotification);
      socketIo
        .to(tripData.driver.toString())
        .emit('notification', driverNotification);
    } else {
      console.error('Socket.IO is not initialized');
    }

    return newTrip;
  } else {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Trip could not be created',
    );
  }
};

const driverTripHistory = async (req: Request) => {
  const { userId } = req.user as IReqUser;
  const { tripStatus } = req.query;
  if (!userId) {
    throw new Error('User ID or status is missing.');
  }
  const query: any = { driver: userId };
  // query.acceptStatus = { $ne: 'pending' };
  if (tripStatus) {
    query.acceptStatus = tripStatus;
  }
  const trips = await Trip.find(query)
    .sort({ createdAt: -1 })
    .populate({
      path: 'driver',
      select: '_id name email role profile_image location',
    })
    .populate({
      path: 'user',
      select: '_id name email role profile_image phoneNumber',
    });

  return trips;
};

const usersTrip = async (req: Request) => {
  try {
    const { userId } = req.user as IReqUser;
    const { status }: any = req.query;

    if (!userId) {
      throw new Error('User ID is missing.');
    }

    const query: any = { user: userId };

    if (status === 'current') {
      query.acceptStatus = { $in: ['pending', 'accepted'] };
    } else if (status === 'history') {
      query.acceptStatus = { $in: ['end', 'cancel'] };
    } else if (status) {
      throw new Error('Invalid status value.');
    }

    const trips = await Trip.find(query)
      .sort({ createdAt: -1 })
      .populate({
        path: 'driver',
        select: '_id name email role profile_image location',
      })
      .populate({
        path: 'user',
        select: '_id name email role profile_image phoneNumber',
      });

    return trips;
  } catch (error) {
    console.error('Error fetching user trips:', error);
    throw new Error('Failed to fetch user trips.');
  }
};

const myTripRequests = async (req: Request) => {
  const { userId } = req.user as IReqUser;
  const result = await Trip.find({
    $and: [{ driver: userId }, { acceptStatus: 'pending' }],
  })
    .sort({ createdAt: -1 })
    .populate({ path: 'driver', select: '_id name email role profile_image' })
    .populate({
      path: 'user',
      select: '_id name email role profile_image phoneNumber',
    });

  const currentTrip = await Trip.findOne({
    $and: [{ driver: userId }, { acceptStatus: 'accepted' }],
  });

  return { result, currentTrip: !!currentTrip };
};

const acceptTrip = async (req: Request) => {
  const { id } = req.params;
  const { userId } = req.user as IReqUser;

  const driver: any = await Driver.findById(userId);

  if (!driver.paypalEmail) {
    throw new ApiError(httpStatus.NOT_FOUND, 'PayPal email does not exist.');
  }

  const trip = await Trip.findById(id);
  if (!trip) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Trip not found');
  }

  if (trip.acceptStatus === 'accepted') {
    throw new ApiError(httpStatus.CONFLICT, 'Trip already accepted');
  }

  const updatedTrip: any = await Trip.findByIdAndUpdate(
    id,
    { acceptStatus: 'accepted' },
    { new: true, runValidators: true },
  );

  if (updatedTrip) {
    const userNotification = await Notification.create({
      title: 'Your Trip Accepted',
      driver: updatedTrip.driver,
      user: updatedTrip.user,
      message: 'Your trip request has been accepted by the driver.',
    });

    const driverNotification = await Notification.create({
      title: 'New Trip Started.',
      driver: updatedTrip.driver,
      user: updatedTrip.user,
      message: `Your new trip has started from ${updatedTrip.pickup} to ${updatedTrip.to}.`,
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

  return updatedTrip;
};

const endTrip = async (req: Request) => {
  const { id } = req.params;
  const { userId } = req.user as IReqUser;

  const [trip, driver]: any = await Promise.all([
    Trip.findById(id),
    Driver.findById(userId),
  ]);

  if (!trip) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Trip not found');
  }
  if (!driver?.paypalEmail) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Driver paypal email not found!');
  }
  if (!trip?.order_id) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'User has not paid yet. Please retry later to complete the trip.',
    );
  }

  if (trip.acceptStatus === 'end') {
    throw new ApiError(httpStatus.CONFLICT, 'Trip already ended');
  }

  await PaymentService.capturePayment(trip.order_id);

  const transfer = await PaymentService.transferPayment({
    amount: Math.floor(trip.amount),
    driverEmail: driver.paypalEmail,
  });

  if (!transfer.batch_id) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Transfer failed. Please check your PayPal email.',
    );
  }

  const updatedTrip = await Trip.findByIdAndUpdate(
    id,
    { acceptStatus: 'end' },
    { new: true, runValidators: true },
  );

  if (updatedTrip) {
    const notifications = [
      {
        title: 'Trip Successfully Completed',
        driver: updatedTrip.driver,
        user: updatedTrip.user,
        message:
          'Your trip has been successfully completed. Thank you for using our service.',
      },
      {
        title: 'Trip Successfully Completed',
        driver: updatedTrip.driver,
        user: userId,
        message:
          'Your trip has been successfully completed. Thank you for your excellent service!',
      },
    ];

    await Notification.insertMany(notifications);

    //@ts-ignore
    if (global.io) {
      //@ts-ignore
      global.io
        .to(updatedTrip.user.toString())
        .emit('notification', notifications[0]);
      //@ts-ignore
      global.io
        .to(updatedTrip.driver.toString())
        .emit('notification', notifications[1]);
    } else {
      console.error('Socket.IO is not initialized');
    }
  }

  return updatedTrip;
};

const cancelTrip = async (req: Request) => {
  const { id } = req.params;
  const { userId } = req.user as IReqUser;

  const trip = await Trip.findById(id);
  if (!trip) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Trip not found');
  }

  if (trip.acceptStatus === 'cancel') {
    throw new ApiError(httpStatus.CONFLICT, 'Trip already canceled');
  }

  const updatedTrip = await Trip.findByIdAndUpdate(
    id,
    { acceptStatus: 'cancel' },
    { new: true, runValidators: true },
  );

  if (updatedTrip) {
    const userNotification = await Notification.create({
      title: 'Trip Canceled',
      driver: updatedTrip.driver,
      user: updatedTrip.user,
      message:
        'Your trip has been canceled by the driver. Please find another driver.',
    });

    const driverNotification = await Notification.create({
      title: 'Trip Canceled',
      driver: updatedTrip.driver,
      user: userId,
      message:
        'The trip has been canceled. Please review your schedule and check for new trip requests.',
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

  return updatedTrip;
};

const searchTrip = async () => {
  // Step 1: Get average ratings for each driver
  const result = await Ratting.aggregate([
    {
      $group: {
        _id: '$driver',
        averageRating: { $avg: '$ratting' },
      },
    },
  ]);

  let formattedResult: any[] = [];
  if (result.length > 0) {
    formattedResult = result.map(driver => ({
      driver: driver._id.toString(),
      averageRating: Number(driver.averageRating.toFixed(2)),
    }));
  }

  const findDriver = await Driver.find({});

  const formattedData = findDriver.map(driver => {
    const driverRating =
      formattedResult.find(rat => rat.driver === driver._id.toString())
        ?.averageRating || 0;

    return {
      id: driver._id,
      trackImage: driver.truckImage,
      truckSize: driver.truckSize,
      cargoCapacity: driver.cargoCapacity,
      kmForPrice: driver.kmForPrice,
      //@ts-ignore
      price: driver?.price,
      ratting: driverRating,
    };
  });

  return formattedData;
};

const searchTripDetails = async (id: string) => {
  const findDriver: any = await Driver.findById(id);

  const formattedData = {
    id: findDriver?._id,
    trackImage: findDriver?.truckImage,
    truckSize: findDriver?.truckSize,
    cargoCapacity: findDriver?.cargoCapacity,
    kmForPrice: findDriver?.kmForPrice,
    price: findDriver?.price,
  };
  return formattedData;
};

export const TripService = {
  insertIntoDB,
  driverTripHistory,
  acceptTrip,
  myTripRequests,
  searchTrip,
  usersTrip,
  endTrip,
  cancelTrip,
  searchTripDetails,
};
