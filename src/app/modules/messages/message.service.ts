/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Request, Response } from 'express';
import Conversation from './conversation.model';
import Message from './message.model';
import ApiError from '../../../errors/ApiError';
import { Server } from 'socket.io';

//* One to one conversation
const sendMessage = async (data: any, io: Server) => {
  const { senderId, receiverId, text } = data;
  // const files: any = req.files;

  if (!receiverId || !senderId) {
    throw new ApiError(404, 'Sender or Receiver user not found');
  }

  let conversation = await Conversation.findOne({
    participants: { $all: [senderId, receiverId] },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [senderId, receiverId],
    });
  }

  const newMessage = new Message({
    senderId,
    receiverId,
    text,
    conversationId: conversation._id,
  });

  conversation.messages.push(newMessage._id);
  await Promise.all([conversation.save(), newMessage.save()]);

  //@ts-ignore
  io.to(senderId).emit('single-message', newMessage || []);
  io.to(receiverId).emit('single-message', newMessage || []);

  return newMessage;
};

const getMessages = async (data: any, io: Server) => {
  const { senderId, receiverId, page } = data;

  if (!receiverId || !senderId) {
    throw new ApiError(404, 'Sender or Receiver user not found');
  }

  const conversation = await Conversation.findOne({
    participants: { $all: [senderId, receiverId] },
  }).populate({
    path: 'messages',
    options: {
      sort: { createdAt: 1 },
      skip: (page - 1) * 20,
      limit: 20,
    },
  });

  if (!conversation) {
    return 'Conversation not found';
  }

  io.to(senderId).emit('message', conversation?.messages || []);
  io.to(receiverId).emit('message', conversation?.messages || []);

  return conversation;
};

const conversationUser = async (data: any, io: Server) => {
  const { loginId } = data;

  try {
    const conversations: any = await Conversation.find({
      participants: { $in: [loginId] },
    }).populate({
      path: 'messages',
      options: {
        sort: { createdAt: 1 },
        limit: 2,
      },
    });

    io.to(loginId).emit('message', conversations || []);
    return conversations;
  } catch (error) {
    console.error('Error fetching conversations for user:', error);
    throw error;
  }
};

export const messageService = {
  sendMessage,
  getMessages,
  conversationUser,
};
