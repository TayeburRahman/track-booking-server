import mongoose from 'mongoose';
import { IMessage } from './interface';

const messageSchema = new mongoose.Schema<IMessage>(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      // ref: 'User',
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      // ref: 'User',
      required: true,
    },
    // conversationId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'Conversation',
    //   required: true,
    // },

    text: {
      type: String,
    },

    image: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: {
      virtuals: true,
    },
  },
);

const Message = mongoose.model('Message', messageSchema);

export default Message;
