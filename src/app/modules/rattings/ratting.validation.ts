import { Types } from 'mongoose';
import { z } from 'zod';
import { IUser } from '../user/user.interface';
import { IDriver } from '../driver/driver.interface';
import { ITrip } from '../trip/trip.interface';

const create = z.object({
  body: z.object({
    driver: z.string({
      required_error: 'driver is required',
    }),
    ratting: z.number({
      required_error: 'ratting is required',
    }),
  }),
});

export const RattingValidation = {
  create,
};

export type IRatting = {
  user: Types.ObjectId | IUser;
  driver: Types.ObjectId | IDriver;
  comment: string;
  ratting: number;
  trip: Types.ObjectId | ITrip;
};
