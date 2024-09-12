import { Request } from 'express';
import Notification from './notifications.model';
import ApiError from '../../../errors/ApiError';
import { IReqUser } from '../user/user.interface';
import QueryBuilder from '../../../builder/QueryBuilder';

//Get
const getNotifications = async (query: Record<string, unknown>) => {
  const notificationQuery = new QueryBuilder(
    Notification.find({ type: 'admin' }),
    query,
  )
    .search(['title'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await notificationQuery.modelQuery;
  const meta = await notificationQuery.countTotal();

  const unreadNotification = await Notification.countDocuments({
    status: false,
  });
  const readNotification = await Notification.countDocuments({ status: true });

  return {
    unreadNotification,
    readNotification,
    meta,
    data: result,
  };
};

//Update
const updateNotification = async (req: Request) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  } else {
    // eslint-disable-next-line no-unused-expressions
    notification.status ? (notification.status = true) : notification?.status;
  }
  await notification.save();
  const notifications = await Notification.find().sort({
    createdAt: -1,
  });
  return notifications;
};

const updateAll = async () => {
  const result = await Notification.updateMany(
    { status: false },
    { $set: { status: true } },
    { new: true },
  ).sort({ createdAt: -1 });
  return result;
};

const userNotification = async (
  user: IReqUser,
  query: Record<string, unknown>,
) => {
  const notificationQuery = await Notification.find({ user: user.userId });

  return {
    data: notificationQuery.reverse(),
  };
};

const driverNotification = async (
  user: IReqUser,
  query: Record<string, unknown>,
) => {
  const notificationQuery = await Notification.find({ driver: user.userId });

  return {
    data: notificationQuery,
  };
};

const adminNotification = async (
  user: IReqUser,
  query: Record<string, unknown>,
) => {
  const notificationQuery = new QueryBuilder(
    Notification.find({ admin: user.userId }),
    query,
  )
    .search(['title'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await notificationQuery.modelQuery;
  const meta = await notificationQuery.countTotal();

  return {
    meta,
    data: result,
  };
};

// const driverNotification = async (data: any, io: Server) => {
//   try {
//     const { driverId } = data;
//     const notificationQuery = await Notification.find({
//       user: data.userId,
//     }).populate('user');

//     // io.to(driverId).emit(
//     //   'get-driver-all-notification',
//     //   notificationQuery || [],
//     // );

//     // return {
//     //   data: notificationQuery,
//     // };
//   } catch (error) {
//     console.error('Error fetching notifications:', error);
//     // return {
//     //   error: 'Failed to retrieve notifications.',
//     // };
//   }
// };

export const NotificationService = {
  getNotifications,
  updateNotification,
  userNotification,
  updateAll,
  driverNotification,
  adminNotification,
};
