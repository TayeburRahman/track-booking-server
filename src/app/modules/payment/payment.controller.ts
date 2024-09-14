import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchasync';
import { PaymentService } from './payment.service';
import sendResponse from '../../../shared/sendResponse';

const makePaymentIntent = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.makePaymentIntent(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment intent create successfully',
    data: result,
  });
});

const saveTripPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.saveTripPayment(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment data save successfully',
    data: result,
  });
});

const getUserPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.getUserPayment(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment data save successfully',
    data: result,
  });
});

const createPayoutToDriver = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.createPayoutToDriver(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment data save successfully',
    data: result,
  });
});

const capturePayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.capturePayment(req.params.orderId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment data save successfully',
    data: result,
  });
});

const getDriverPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.saveTripPayment(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment data save successfully',
    data: result,
  });
});

const getAllPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.getAllPayment(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment data save successfully',
    data: result,
  });
});

export const PaymentController = {
  makePaymentIntent,
  saveTripPayment,
  getUserPayment,
  getAllPayment,
  createPayoutToDriver,
  capturePayment,
};
