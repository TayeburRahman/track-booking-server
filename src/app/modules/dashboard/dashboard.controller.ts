import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchasync';
import { DashboardService } from './dashboard.service';
import sendResponse from '../../../shared/sendResponse';
import { IDriver } from '../driver/driver.interface';
import { IUser } from '../user/user.interface';
import ApiError from '../../../errors/ApiError';
import httpStatus from 'http-status';
import Driver from '../driver/driver.model';
import User from '../user/user.model';

const totalCount = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.totalCount();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Data retrieved successful',
    data: result,
  });
});

const getDriverGrowth = catchAsync(async (req: Request, res: Response) => {
  const year = req.query.year
    ? parseInt(req.query.year as string, 10)
    : undefined;
  const result = await DashboardService.getDriverGrowth(year);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Data retrieved successful',
    data: result,
  });
});

const getAllDriver = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.getAllDriver(req.query);
  sendResponse<IDriver[]>(res, {
    statusCode: 200,
    success: true,
    message: 'Driver retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.getAllUsers(req.query);
  sendResponse<IUser[]>(res, {
    statusCode: 200,
    success: true,
    message: 'Users retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

// ---------------

const searchByUserName = catchAsync(async (req: Request, res: Response) => {
  const { name } = req.query;
  if (typeof name !== 'string') {
    return res.status(400).json({ error: 'Invalid query parameter' });
  }
  const result = await DashboardService.getSerchUser(name);
  res.status(200).json(result);
});

const searchByDriverName = catchAsync(async (req: Request, res: Response) => {
  const { name } = req.query;
  if (typeof name !== 'string') {
    return res.status(400).json({ error: 'Invalid query parameter' });
  }
  const result = await DashboardService.getSerchDriver(name);
  res.status(200).json(result);
});

const deleteDriverById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await DashboardService.deleteDriver(id);
  res.status(200).json(result);
});

const deleteUserById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await DashboardService.deleteDriver(id);
  res.status(200).json(result);
});

const getSingleDriver = catchAsync(async (req: Request, res: Response) => {
  const { id: _id } = req.params;
  const result = await Driver.findById({ _id });
  res.status(200).json(result);
});

const getSingleUser = catchAsync(async (req: Request, res: Response) => {
  const { id: _id } = req.params;
  const result = await User.findById({ _id });
  res.status(200).json(result);
});

export const DashboardController = {
  totalCount,
  getDriverGrowth,
  getAllDriver,
  getAllUsers,
  searchByUserName,
  searchByDriverName,
  deleteDriverById,
  deleteUserById,
  getSingleDriver,
  getSingleUser,
};
