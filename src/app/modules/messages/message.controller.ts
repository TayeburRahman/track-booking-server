import { Request, RequestHandler, Response } from 'express';
import sendResponse from '../../../shared/sendResponse';
import catchAsync from '../../../shared/catchasync';
import { messageService } from './message.service';

const sendMessage: RequestHandler = async data => {
  // const result = await messageService.sendMessage(data);
  // sendResponse(res, {
  // statusCode: 200,
  // success: true,
  // message: `Message Send`,
  // data: result,
  // // });
};

const getMessages: RequestHandler = catchAsync(
  async (req: Request, res: Response) => {
    // const result = await messageService.getMessages(req, res);
    // sendResponse(res, {
    //   statusCode: 200,
    //   success: true,
    //   data: result,
    // });
  },
);

const conversationUser: RequestHandler = catchAsync(
  async (req: Request, res: Response) => {
    // const result = await messageService.conversationUser(req);
    // console.log('result', result);
    // sendResponse(res, {
    //   statusCode: 200,
    //   success: true,
    //   message: 'Conversation Retrieved Successfully',
    //   data: result,
    // });
  },
);

// no use this controller
export const messageController = {
  sendMessage,
  getMessages,
  conversationUser,
};
