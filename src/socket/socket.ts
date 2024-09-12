import { Server as SocketIOServer, Socket } from 'socket.io';
import http, { Server as HTTPServer } from 'http';
import express, { Application } from 'express';
import Driver from '../app/modules/driver/driver.model';
import User from '../app/modules/user/user.model';
import getUserDetailsFromToken from '../helpers/getUserDetailsFromToken';
import Conversation from '../app/modules/messages/conversation.model';
import { messageService } from '../app/modules/messages/message.service';
import { NotificationService } from '../app/modules/notifications/notifications.service';

// Define types for data payloads and responses
interface UserDetails {
  _id: string;
  name: string;
  profile_image?: string;
}

interface UserPayload {
  _id: string;
  name: string;
  profile_image?: string;
  online: boolean;
}

// Set of online users
const onlineUser = new Set<string>();

export const app: Application = express();

// Create an HTTP server
export const server: HTTPServer = http.createServer(app);

// Initialize Socket.IO server with CORS configuration
const io = new SocketIOServer(server, {
  cors: {
    origin: 'http://localhost:5173',
    credentials: true,
  },
});

//@ts-ignore
global.io = io;

io.on('connection', async (socket: Socket) => {
  try {
    const token = socket?.handshake?.auth?.token as string;
    const currentUser: any = await getUserDetailsFromToken(token);

    if (!currentUser) {
      socket.disconnect();
      console.log(`Check token disconnected`);
      return;
    }

    const senderId = currentUser._id.toString();

    // Join room based on user ID
    socket.join(senderId);
    onlineUser.add(senderId);

    // console.log('currentUser', senderId);

    // Broadcast online users
    io.emit('onlineUser', Array.from(onlineUser));

    // Handle 'message-page' event
    socket.on('message-page', async ({ receiverId, senderId }: any) => {
      try {
        let userDetails: UserDetails | null = null;

        const driverUserDetails = await Driver.findById(receiverId);
        if (driverUserDetails) {
          userDetails = {
            _id: driverUserDetails._id.toString(),
            name: driverUserDetails.name,
            profile_image: driverUserDetails.profile_image,
          };
        }

        const dentalUserDetails = await User.findById(receiverId);
        if (dentalUserDetails) {
          userDetails = {
            _id: dentalUserDetails._id.toString(),
            name: dentalUserDetails.name,
            profile_image: dentalUserDetails.profile_image,
          };
        }

        if (userDetails) {
          const payload: UserPayload = {
            _id: userDetails._id,
            name: userDetails.name,
            profile_image: userDetails.profile_image,
            online: onlineUser.has(receiverId),
          };
          socket.emit('message-user', payload);
        } else {
          console.log(`User with ID ${receiverId} not found`);
        }

        // Get previous messages
        const conversationPv = await Conversation.findOne({
          participants: { $all: [senderId, receiverId] },
        }).populate('messages');

        socket.emit('message', conversationPv?.messages || []);
      } catch (err) {
        console.error('Error handling message-page:', err);
      }
    });

    // Handle ADD NEW MASSAGE event: 'new-message'
    socket.on(
      'new-message',
      async (data: {
        senderId: string;
        receiverId: string;
        text: string;
        image?: string;
      }) => {
        try {
          await messageService.sendMessage(data, io);
        } catch (err) {
          socket.emit('error', { message: err });
          console.error('Error sending new message:', err);
        }
      },
    );

    // Handle GET MASSAGE event: 'get-message'
    socket.on(
      'get-message',
      async (data: { senderId: string; receiverId: string; page: string }) => {
        try {
          if (!data.receiverId || !data.senderId) {
            socket.emit('error', {
              message: 'Sender or Receiver user not found',
            });
          } else {
            await messageService.getMessages(data, io);
          }
        } catch (err) {
          console.error('Error sending new message:', err);
        }
      },
    );

    // Handle GET CONVERSATION LIST event: 'get-conversation'
    socket.on('get-conversation', async (data: { loginId: string }) => {
      try {
        if (data?.loginId) {
          await messageService.conversationUser(data, io);
        } else {
          socket.emit('error', { message: 'Login ID is required' });
        }
      } catch (err) {
        console.error('Error sending new message:', err);
      }
    });

    // Handle GET CONVERSATION LIST event: 'get-conversation'
    // socket.on('get-user-all-notification', async (data: { userId: string }) => {
    //   try {
    //     if (data?.userId) {
    //       await NotificationService.myNotification(data, io);
    //     } else {
    //       socket.emit('error', { message: 'User ID is required' });
    //     }
    //   } catch (err) {
    //     console.error('Error sending new message:', err);
    //   }
    // });

    // Handle user disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${senderId}`);
      onlineUser.delete(senderId);
      io.emit('onlineUser', Array.from(onlineUser));
    });
  } catch (err) {
    console.error('Connection error:', err);
    socket.disconnect();
  }
});
