/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import bcrypt from 'bcrypt';
import ApiError from '../../../errors/ApiError';
import cron from 'node-cron';
import { JwtPayload, Secret } from 'jsonwebtoken';
import config from '../../../config';
import { Request } from 'express';
import { jwtHelpers } from '../../../helpers/jwtHelpers';
import { IChangePassword, ILoginUser } from '../auth/auth.interface';
import QueryBuilder from '../../../builder/QueryBuilder';
import { IGenericResponse } from '../../../interfaces/paginations';
import httpStatus from 'http-status';
import sendEmail from '../../../utils/sendEmail';
import { registrationSuccessEmailBody } from '../../../mails/user.register';
import { ENUM_USER_ROLE } from '../../../enums/user';
import { sendResetEmail } from '../auth/sendResetMails';
import { logger } from '../../../shared/logger';
import { IActivationRequest, IDriver, Ilocation } from './driver.interface';
import Driver from './driver.model';
import { IReqUser, IUser } from '../user/user.interface';
import { CustomRequest } from '../../../interfaces/common';
import { haversineDistance, validateEmail } from './driver.help';
import Trip from '../trip/trip.model';

//!
const registerDriver = async (req: CustomRequest) => {
  const { files } = req;
  const payload = req.body as unknown as IDriver;
  const { name, email, password, confirmPassword } = payload;

  payload.expirationTime = (Date.now() + 2 * 60 * 1000) as any;

  const isEmailExist = await Driver.findOne({ email, isActive: true });

  if (isEmailExist) {
    throw new ApiError(400, 'Email already exist');
  }

  if (confirmPassword !== password) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Password and Confirm Password Didn't Match",
    );
  }

  const isEmailExistInactive = await Driver.findOne({ email, isActive: false });

  if (isEmailExistInactive) {
    await Driver.deleteOne({ email });
  }

  if (files) {
    if (files.licenseFrontImage) {
      payload.licenseFrontImage = `/images/licenses/${files.licenseFrontImage[0].filename}`;
    }
    if (files.licenseBackImage) {
      payload.licenseBackImage = `/images/licenses/${files.licenseBackImage[0].filename}`;
    }
    if (files.truckDocumentImage) {
      payload.truckDocumentImage = `/images/trucks/${files.truckDocumentImage[0].filename}`;
    }
    if (files.truckImage) {
      payload.truckImage = `/images/trucks/${files.truckImage[0].filename}`;
    }
    if (files.profile_image) {
      //@ts-ignore
      data.profile_image = `/images/profile/${files.profile_image[0].filename}`;
    }
  }

  const activationToken = createActivationToken();
  const activationCode = activationToken.activationCode;
  const data = { user: { name: name }, activationCode };

  try {
    sendEmail({
      email: email,
      subject: 'Activate Your Account',
      html: registrationSuccessEmailBody(data),
    });
  } catch (error: any) {
    throw new ApiError(500, `${error.message}`);
  }
  payload.activationCode = activationCode;
  return await Driver.create(payload);
};

//!
const updateProfile = async (req: CustomRequest): Promise<IDriver | null> => {
  const { files } = req as any; // Cast req to include files property
  const { userId } = req.user as IReqUser;

  // Validate user existence
  const checkValidDriver = await Driver.findById(userId);
  if (!checkValidDriver) {
    throw new ApiError(404, 'You are not authorized');
  }

  // Prepare data for updating
  const data = req.body;

  // Handle file uploads if they exist
  const fileUploads: Partial<IDriver> = {};
  if (files) {
    if (files.licenseFrontImage && files.licenseFrontImage[0]) {
      fileUploads.licenseFrontImage = `/images/licenses/${files.licenseFrontImage[0].filename}`;
    }
    if (files.licenseBackImage && files.licenseBackImage[0]) {
      fileUploads.licenseBackImage = `/images/licenses/${files.licenseBackImage[0].filename}`;
    }
    if (files.truckDocumentImage && files.truckDocumentImage[0]) {
      fileUploads.truckDocumentImage = `/images/trucks/${files.truckDocumentImage[0].filename}`;
    }
    if (files.truckImage && files.truckImage[0]) {
      fileUploads.truckImage = `/images/trucks/${files.truckImage[0].filename}`;
    }
    if (files.profile_image && files.profile_image[0]) {
      fileUploads.profile_image = `/images/profile/${files.profile_image[0].filename}`;
    }
  }

  // Merge data and file uploads
  const updatedUserData = { ...data, ...fileUploads };
  console.log('DriverData', updatedUserData);

  // Update driver profile
  const result = await Driver.findOneAndUpdate(
    { _id: userId },
    updatedUserData,
    {
      new: true,
      runValidators: true,
    },
  );

  return result;
};

//!
const createActivationToken = () => {
  const activationCode = Math.floor(100000 + Math.random() * 900000).toString();
  return { activationCode };
};

//!
const activateDriver = async (payload: { code: string; email: string }) => {
  const { code, email } = payload;

  const existUser = await Driver.findOne({ email: email });
  if (!existUser) {
    throw new ApiError(400, 'Driver not found!');
  }
  if (existUser.activationCode !== code) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Code didn't match");
  }
  const driver = (await Driver.findOneAndUpdate(
    { email: email },
    { isActive: true },
    {
      new: true,
      runValidators: true,
    },
  )) as IDriver;

  const accessToken = jwtHelpers.createToken(
    {
      userId: existUser._id,
      role: existUser.role,
    },
    config.jwt.secret as Secret,
    config.jwt.expires_in as string,
  );
  //Create refresh token
  const refreshToken = jwtHelpers.createToken(
    { userId: existUser._id, role: existUser.role },
    config.jwt.refresh_secret as Secret,
    config.jwt.refresh_expires_in as string,
  );
  return {
    accessToken,
    refreshToken,
    driver,
  };
};

cron.schedule('*/3 * * * *', async () => {
  try {
    const now = new Date();
    const result = await Driver.updateMany(
      {
        isActive: false,
        expirationTime: { $lte: now },
      },
      {
        $unset: { activationCode: '' },
      },
    );

    if (result.modifiedCount > 0) {
      logger.info(
        `Removed activation codes from ${result.modifiedCount} expired inactive users`,
      );
    }
  } catch (error) {
    logger.error('Error removing activation codes from expired users:', error);
  }
});

//!
const getAllDriver = async (
  query: Record<string, unknown>,
): Promise<IGenericResponse<IDriver[]>> => {
  const driverQuery = new QueryBuilder(Driver.find(), query)
    .search(['name'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await driverQuery.modelQuery;
  const meta = await driverQuery.countTotal();

  return {
    meta,
    data: result,
  };
};

//!
const getSingleDriver = async (user: IReqUser) => {
  const result = await Driver.findById(user?.userId);
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Driver not found');
  }

  return result;
};

//!
const deleteDriver = async (id: string): Promise<IDriver | null> => {
  const result = await Driver.findByIdAndDelete(id);

  return result;
};

//!
const loginDriver = async (payload: ILoginUser) => {
  const { email, password } = payload;

  const isDriverExist = (await Driver.isDriverExist(email)) as IDriver;
  const checkDriver = (await Driver.findOne({ email })) as IDriver;
  if (!isDriverExist) {
    throw new ApiError(404, 'Driver does not exist');
  }

  if (
    isDriverExist.password &&
    !(await Driver.isPasswordMatched(password, isDriverExist.password))
  ) {
    throw new ApiError(402, 'Wrong credentials');
  }
  if (checkDriver.isActive === false) {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      'Please active your account then try to login',
    );
  }

  const { _id: userId, role } = isDriverExist;
  const accessToken = jwtHelpers.createToken(
    { userId, role },
    config.jwt.secret as Secret,
    config.jwt.expires_in as string,
  );
  //Create refresh token
  const refreshToken = jwtHelpers.createToken(
    { userId, role },
    config.jwt.refresh_secret as Secret,
    config.jwt.refresh_expires_in as string,
  );

  return {
    id: checkDriver?._id,
    driver: checkDriver,
    accessToken,
    refreshToken,
  };
};

//!
const deleteMyAccount = async (req: Request) => {
  const { password } = req.body;
  const { userId } = req.user as any;

  const isDriverExist = await Driver.findById(userId);
  //@ts-ignore
  if (!isDriverExist) {
    throw new ApiError(404, 'Driver does not exist');
  }

  const currentTrip = await Trip.findOne({
    $and: [{ driver: userId }, { acceptStatus: 'accepted' }],
  });

  if (currentTrip) {
    throw new ApiError(400, 'Please end your current trip!');
  }

  if (
    isDriverExist.password &&
    !(await Driver.isPasswordMatched(password, isDriverExist.password))
  ) {
    throw new ApiError(402, 'Password is incorrect');
  }
  return await Driver.findOneAndDelete({ _id: userId });
};

//!
const changePassword = async (
  user: JwtPayload | null,
  payload: IChangePassword,
): Promise<void> => {
  const { userId } = user as any;
  //@ts-ignore
  const { oldPassword, newPassword, confirmPassword } = payload;
  if (newPassword !== confirmPassword) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Password and Confirm password not match',
    );
  }
  const isDriverExist = await Driver.findOne({ _id: userId }).select(
    '+password',
  );
  if (!isDriverExist) {
    throw new ApiError(404, 'Driver does not exist');
  }
  if (
    isDriverExist.password &&
    !(await Driver.isPasswordMatched(oldPassword, isDriverExist.password))
  ) {
    throw new ApiError(402, 'Old password is incorrect');
  }
  isDriverExist.password = newPassword;
  await isDriverExist.save();
};

//!
const forgotPass = async (payload: { email: string }) => {
  const user = (await Driver.findOne(
    { email: payload.email },
    { _id: 1, role: 1 },
  )) as IDriver;

  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Driver does not exist!');
  }

  let profile = null;
  if (user.role === ENUM_USER_ROLE.DRIVER) {
    profile = await Driver.findOne({ _id: user?._id });
  }

  if (!profile) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Pofile not found!');
  }

  if (!profile.email) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email not found!');
  }

  const activationCode = forgetActivationCode();
  const expiryTime = new Date(Date.now() + 15 * 60 * 1000);
  user.verifyCode = activationCode;
  user.verifyExpire = expiryTime;
  await user.save();

  sendResetEmail(
    profile.email,
    `
      <div>
        <p>Hi, ${profile.name}</p>
        <p>Your password reset Code: ${activationCode}</p>
        <p>Thank you</p>
      </div>
  `,
  );
};

//!
const resendVerifyCode = async (payload: { email: string }) => {
  const email = payload.email;
  const user = await Driver.findOne({ email });

  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Driver does not exist!');
  }

  let profile = null;
  if (user.role === ENUM_USER_ROLE.DRIVER) {
    profile = await Driver.findOne({ _id: user._id });
  }

  if (!profile) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Profile not found!');
  }

  if (!profile.email) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email not found!');
  }

  const activationCode = forgetActivationCode();
  const expiryTime = new Date(Date.now() + 15 * 60 * 1000);
  user.verifyCode = activationCode;
  user.verifyExpire = expiryTime;
  await user.save();
  sendResetEmail(
    profile.email,
    `
      <div>
        <p>Hi, ${profile.name}</p>
        
        <p>Your password reset Code: ${activationCode}</p>
        <p>Thank you</p>
      </div>
  `,
  );
};

//!
const resendActiveCode = async (payload: { email: string }) => {
  const email = payload.email;
  const user = await Driver.findOne({ email });

  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Driver does not exist!');
  }

  let profile = null;
  if (user.role === ENUM_USER_ROLE.DRIVER) {
    profile = await Driver.findOne({ _id: user._id });
  }

  if (!profile) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Profile not found!');
  }

  if (!profile.email) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email not found!');
  }

  const activationCode = forgetActivationCode();
  const expiryTime = new Date(Date.now() + 15 * 60 * 1000);
  user.activationCode = activationCode;
  user.verifyExpire = expiryTime;
  await user.save();
  sendResetEmail(
    profile.email,
    `
      <div>
        <p>Hi, ${profile.name}</p>
        
        <p>Your password reset Code: ${activationCode}</p>
        <p>Thank you</p>
      </div>
  `,
  );
};

//!
const resendActivationCode = async (payload: { email: string }) => {
  const email = payload.email;
  const user = await Driver.findOne({ email });

  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Driver does not exist!');
  }

  let profile = null;
  if (user.role === ENUM_USER_ROLE.DRIVER) {
    profile = await Driver.findOne({ _id: user._id });
  }

  if (!profile) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Profile not found!');
  }

  if (!profile.email) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email not found!');
  }

  const activationCode = forgetActivationCode();
  const expiryTime = new Date(Date.now() + 15 * 60 * 1000);
  user.activationCode = activationCode;
  user.verifyExpire = expiryTime;
  await user.save();
  sendResetEmail(
    profile.email,
    `
      <div>
        <p>Hi, ${profile.name}</p>
        
        <p>Your password reset Code: ${activationCode}</p>
        <p>Thank you</p>
      </div>
  `,
  );
};

//!
const forgetActivationCode = () => {
  const activationCode = Math.floor(100000 + Math.random() * 900000).toString();
  return activationCode;
};

//!
const checkIsValidForgetActivationCode = async (payload: {
  code: string;
  email: string;
}) => {
  console.log('wefnjdksngf', payload.code, payload.email);
  const user = await Driver.findOne({ email: payload.email });

  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Driver does not exist!');
  }

  if (user.verifyCode !== payload.code) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid reset code!');
  }

  const currentTime = new Date();
  if (currentTime > user.verifyExpire) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Reset code has expired!');
  }

  return { valid: true };
};

//!
const resetPassword = async (payload: {
  email: string;
  newPassword: string;
  confirmPassword: string;
}) => {
  const { email, newPassword, confirmPassword } = payload;
  if (newPassword !== confirmPassword) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Password didn't match");
  }
  const user = await Driver.findOne({ email }, { _id: 1 });

  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User not found!');
  }

  const password = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  await Driver.updateOne({ email }, { password }, { new: true });
  //@ts-ignore
  user.verifyCode = null;
  //@ts-ignore
  user.verifyExpire = null;
  await user.save();
};

const blockDriver = async (id: string): Promise<IDriver | null> => {
  const isDriverExist = await Driver.findById(id);
  if (!isDriverExist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No Driver Found');
  }
  const result = await Driver.findByIdAndUpdate(
    { _id: id },
    { is_block: !isDriverExist.is_block },
    { new: true },
  );

  return result;
};

const truckLocationUpdate = async (req: Request): Promise<IDriver | null> => {
  const { id } = req.params;
  const { latitude, longitude, address }: Ilocation = req.body;

  // Validate parameters
  if (!id || latitude === undefined || longitude === undefined) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid request parameters');
  }

  // Update driver location
  const updatedDriver = await Driver.findByIdAndUpdate(
    id,
    {
      $set: { location: { latitude, longitude, address } },
    },
    { new: true },
  );

  if (!updatedDriver) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Driver not found!');
  }

  const { location } = updatedDriver;

  const trip: any = await Trip.findOne({
    driver: id,
    acceptStatus: 'accepted',
  });

  if (trip) {
    //@ts-ignore
    if (global.io) {
      //@ts-ignore
      const socketIo = global.io;
      socketIo.to(trip?.user.toString()).emit('driver-location', location);
    } else {
      console.error('Socket.IO is not initialized');
    }
  }

  return updatedDriver;
};

const locationUpdateSocket = async (data: any) => {
  const { latitude, longitude, address, driver_id }: any = data;

  // Validate parameters
  if (!driver_id || latitude === undefined || longitude === undefined) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid request parameters');
  }

  // Update driver location
  const updatedDriver = await Driver.findByIdAndUpdate(
    driver_id,
    {
      $set: { location: { latitude, longitude, address } },
    },
    { new: true },
  );

  if (!updatedDriver) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Driver not found!');
  }

  const { location } = updatedDriver;

  const trip: any = await Trip.findOne({
    driver: driver_id,
    acceptStatus: 'accepted',
  });

  if (trip) {
    //@ts-ignore
    if (global.io) {
      //@ts-ignore
      const socketIo = global.io;
      socketIo.to(trip?.user.toString()).emit('driver-location', location);
    } else {
      console.error('Socket.IO is not initialized');
    }
  }

  return updatedDriver;
};

const truckLocation = async (id: string): Promise<IDriver | null> => {
  const result = await Driver.findById(id);

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No Driver Found');
  }

  const formattedData: any = {
    location: result.location,
    name: result.name,
  };

  return formattedData;
};

const allTruckLocation = async () => {
  const drivers = await Driver.find()
    .select('_id name phoneNumber profile_image location')
    .exec();

  if (!drivers.length) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No Driver Found');
  }

  return drivers;
};

const getDriversSortedByDistance = async (req: Request): Promise<IDriver[]> => {
  const { latitude, longitude, maxDistance } = req.body;

  // console.log(
  //   'latitude, longitude, maxDistance',
  //   latitude,
  //   longitude,
  //   maxDistance,
  // );

  // Fetch all drivers from the database
  const allDrivers = await Driver.find({});

  // Calculate distance and filter drivers
  const driversWithDistance = allDrivers
    .map(driver => {
      const driverLat: any = driver?.location?.latitude;
      const driverLon: any = driver?.location?.longitude;
      const distance = haversineDistance(
        latitude,
        longitude,
        driverLat,
        driverLon,
      );

      return { ...driver.toObject(), distance };
    })
    .filter(driver => driver.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance);

  return driversWithDistance;
};

const getDriverLocation = async (data: any) => {
  const { driverId, userId } = data;

  const findDriver: any = await Driver.findById(driverId);
  if (!findDriver) {
    throw new Error('Driver not found');
  }

  const formattedData = {
    location: findDriver.location,
    name: findDriver.name,
  };

  //@ts-ignore
  if (global.io) {
    //@ts-ignore
    const socketIo = global.io;
    socketIo.to(userId).emit('driver-location', formattedData);
  } else {
    console.error('Socket.IO is not initialized');
  }
  return formattedData;
};

const updatePaypalEmail = async (req: Request) => {
  const { userId } = req.user as IReqUser;
  const { paypalEmail } = req.body;

  const isValid = await validateEmail(paypalEmail);

  console.log(isValid);

  if (!isValid) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'The email address provided is not valid. Please enter a valid PayPal email address.',
    );
  }

  const driverUpdate = await Driver.findByIdAndUpdate(
    userId,
    { paypalEmail },
    { new: true },
  );

  if (!driverUpdate) {
    throw new Error('Email update Failed!');
  }

  return driverUpdate;
};

export const DriverService = {
  getAllDriver,
  getSingleDriver,
  deleteDriver,
  registerDriver,
  loginDriver,
  changePassword,
  updateProfile,
  forgotPass,
  resetPassword,
  activateDriver,
  deleteMyAccount,
  checkIsValidForgetActivationCode,
  resendVerifyCode,
  blockDriver,
  truckLocation,
  truckLocationUpdate,
  allTruckLocation,
  getDriversSortedByDistance,
  getDriverLocation,
  updatePaypalEmail,
  locationUpdateSocket,
  resendActivationCode,
  resendActiveCode,
};
