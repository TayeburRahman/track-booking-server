import mongoose, { Schema } from 'mongoose';
import { DriverModel, IDriver, Ilocation } from './driver.interface';
import config from '../../../config';
import bcrypt from 'bcrypt';

const locationSchema = new Schema<Ilocation>({
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  address: {
    type: String,
    // required: true,
  },
});

const driverSchema = new Schema<IDriver>(
  {
    name: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: false,
      unique: false,
    },
    password: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      default: 'DRIVER',
    },
    phoneNumber: {
      type: String,
      required: false,
    },
    drivingLicenseNumber: {
      type: String,
      required: false,
    },
    drivingLicenseExpireDate: {
      type: Date,
      required: false,
    },
    profile_image: {
      type: String,
      // default:
      //   'https://res.cloudinary.com/arafatleo/image/upload/v1720600946/images_1_dz5srb.png',
    },
    licenseFrontImage: {
      type: String,
      required: false,
    },
    licenseBackImage: {
      type: String,
      required: false,
    },
    truckRegistrationNumber: {
      type: String,
      required: false,
    },
    truckDocumentImage: {
      type: String,
      required: false,
    },
    truckImage: {
      type: String,
      required: false,
    },
    truckSize: {
      type: String,
      // required: false,
    },
    truckType: {
      type: String,
      // required: false,
    },
    cargoCapacity: {
      type: String,
      // required: false,
    },
    services: {
      type: [String],
      required: false,
    },
    kmForPrice: {
      type: String,
      required: false,
    },
    // price: {
    //   type: String,
    //   // required: false,
    // },
    bankAccountNumber: {
      type: String,
      required: false,
    },
    bankName: {
      type: String,
      required: false,
    },
    routingNumber: {
      type: String,
      required: false,
    },
    accountHolderName: {
      type: String,
      required: false,
    },
    verifyCode: {
      type: String,
    },
    activationCode: {
      type: String,
    },
    verifyExpire: {
      type: Date,
    },
    expirationTime: { type: Date, default: () => Date.now() + 2 * 60 * 1000 },
    isActive: {
      type: Boolean,
      default: false,
    },
    is_block: {
      type: Boolean,
      default: false,
    },
    location: {
      type: locationSchema,
    },
  },
  {
    timestamps: true,
  },
);
driverSchema.statics.isDriverExist = async function (
  email: string,
): Promise<Pick<IDriver, '_id' | 'password' | 'phoneNumber' | 'role'> | null> {
  return await Driver.findOne(
    { email },
    {
      _id: 1,
      email: 1,
      password: 1,
      role: 1,
      phoneNumber: 1,
    },
  );
};

driverSchema.statics.isPasswordMatched = async function (
  givenPassword: string,
  savedPassword: string,
): Promise<boolean> {
  return await bcrypt.compare(givenPassword, savedPassword);
};

driverSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  this.password = await bcrypt.hash(
    this.password,
    Number(config.bcrypt_salt_rounds),
  );
  next();
});

const Driver = mongoose.model<IDriver, DriverModel>('Driver', driverSchema);

export default Driver;
