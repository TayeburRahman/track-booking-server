import { Request, RequestHandler, Response } from 'express';
import sendResponse from '../../../shared/sendResponse';
import catchAsync from '../../../shared/catchasync';
import { NotificationService } from './notifications.service';
import { IReqUser } from '../user/user.interface';

//get notification only for admin
const getNotifications: RequestHandler = catchAsync(
  async (req: Request, res: Response) => {
    const result = await NotificationService.getNotifications(req.query);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: `Notification retrieved successfully`,
      data: result,
    });
  },
);

//update notification only for admin
const updateNotification: RequestHandler = catchAsync(
  async (req: Request, res: Response) => {
    const result = await NotificationService.updateNotification(req);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: `Notification updated successfully`,
      data: result,
    });
  },
);

const updateAll: RequestHandler = catchAsync(
  async (req: Request, res: Response) => {
    const result = await NotificationService.updateAll();
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: `Notification updated successfully`,
      data: result,
    });
  },
);

const userNotification: RequestHandler = catchAsync(
  async (req: Request, res: Response) => {
    const result = await NotificationService.userNotification(
      req.user as IReqUser,
      req.query,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: `Notification retrieved successfully`,
      data: result,
    });
  },
);

const driverNotification: RequestHandler = catchAsync(
  async (req: Request, res: Response) => {
    const result = await NotificationService.driverNotification(
      req.user as IReqUser,
      req.query,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: `Notification retrieved successfully`,
      data: result,
    });
  },
);

const adminNotification: RequestHandler = catchAsync(
  async (req: Request, res: Response) => {
    const result = await NotificationService.adminNotification(
      req.user as IReqUser,
      req.query,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: `Notification retrieved successfully`,
      data: result,
    });
  },
);

export const NotificationController = {
  getNotifications,
  updateNotification,
  userNotification,
  updateAll,
  adminNotification,
  driverNotification,
};
