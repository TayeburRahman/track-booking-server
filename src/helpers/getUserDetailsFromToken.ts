import Admin from '../app/modules/admin/admin.model';
import Driver from '../app/modules/driver/driver.model';
import User from '../app/modules/user/user.model';
import config from '../config';
import ApiError from '../errors/ApiError';
import { Secret, verify, JwtPayload } from 'jsonwebtoken';
import { Document } from 'mongoose';

const httpStatus = require('http-status');

interface DecodePayload extends JwtPayload {
  role?: string;
  userId?: string;
}

const getUserDetailsFromToken = async (
  token: string | undefined,
): Promise<Document | null> => {
  // console.log('getUserDetailsFromToken', token);
  if (!token) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid token');
  }

  // Verify and decode the token
  let decode: DecodePayload;
  try {
    decode = verify(token, config.jwt.secret as Secret) as DecodePayload;
  } catch (err) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Token verification failed');
  }

  let user: Document | null = null;

  if (decode.role === 'ADMIN') {
    user = await Admin.findById(decode.userId);
  } else if (decode.role === 'DRIVER') {
    user = await Driver.findById(decode.userId);
  } else if (decode.role === 'USER') {
    user = await User.findById(decode.userId);
  }

  return user;
};

export default getUserDetailsFromToken;
