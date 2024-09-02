/* eslint-disable no-unused-vars */
import { Model, Types } from 'mongoose';

export type Ilocation = {
  latitude: Number;
  longitude: Number;
  address: string;
};

export type IDriver = {
  save(): unknown;
  _id?: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  drivingLicenseNumber: string;
  drivingLicenseExpireDate: Date;
  profile_image: string;
  licenseFrontImage: string;
  licenseBackImage: string;
  truckRegistrationNumber: string;
  truckDocumentImage: string;
  truckImage: string;
  truckSize: string;
  truckType: string;
  cargoCapacity: string;
  services: [];
  kmForPrice: string;
  bankAccountNumber: string;
  bankName: string;
  routingNumber: string;
  accountHolderName: string;
  confirmPassword: string;
  role: 'DRIVER';
  verifyCode: string;
  activationCode: string;
  verifyExpire: Date;
  expirationTime: Date;
  isActive: boolean;
  is_block: boolean;
  location: Ilocation;
};

export type IActivationToken = {
  token: string;
  activationCode: string;
};
export type IActivationRequest = {
  userEmail: string;
  activation_code: string;
};
export type IEmailOptions = {
  email: string;
  subject: string;
  html: any;
};
export type DriverModel = {
  isDriverExist(
    email: string,
  ): Promise<
    Pick<IDriver, '_id' | 'email' | 'password' | 'role' | 'phoneNumber'>
  >;
  isPasswordMatched(
    givenPassword: string,
    savedPassword: string,
  ): Promise<boolean>;
} & Model<IDriver>;
