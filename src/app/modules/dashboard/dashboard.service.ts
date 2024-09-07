/* eslint-disable @typescript-eslint/ban-ts-comment */
import QueryBuilder from '../../../builder/QueryBuilder';
import { getYearRange } from '../../../helpers/yearRange';
import { IGenericResponse } from '../../../interfaces/paginations';
import { logger } from '../../../shared/logger';
import { IDriver } from '../driver/driver.interface';
import Driver from '../driver/driver.model';
import { Ratting } from '../rattings/rattings.model';
import { IUser } from '../user/user.interface';

import User from '../user/user.model';

const totalCount = async () => {
  const users = await User.countDocuments();
  const drivers = await Driver.countDocuments();

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const newDrivers = await Driver.countDocuments({
    createdAt: { $gte: oneMonthAgo },
  });

  const newDriversDetails = await Driver.find({
    createdAt: { $gte: oneMonthAgo },
  });

  return {
    users,
    drivers,
    newDrivers,
    newDriversDetails,
  };
};

const getDriverGrowth = async (year?: number) => {
  try {
    const currentYear = new Date().getFullYear();
    const selectedYear = year || currentYear;

    const { startDate, endDate } = getYearRange(selectedYear);

    const monthlyDriverGrowth = await Driver.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lt: endDate,
          },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          month: '$_id.month',
          year: '$_id.year',
          count: 1,
        },
      },
      {
        $sort: { month: 1 },
      },
    ]);

    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const result = Array.from({ length: 12 }, (_, i) => {
      const monthData = monthlyDriverGrowth.find(
        data => data.month === i + 1,
      ) || {
        month: i + 1,
        count: 0,
        year: selectedYear,
      };
      return {
        ...monthData,
        month: months[i],
      };
    });

    return {
      year: selectedYear,
      data: result,
    };
  } catch (error) {
    logger.error('Error in getDriverGrowth function: ', error);
    throw error;
  }
};

const getAllDriver = async (
  query: Record<string, unknown>,
): Promise<IGenericResponse<IDriver[]>> => {
  const driverQuery = new QueryBuilder(Driver.find(), query)
    .search(['name'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const drivers = await driverQuery.modelQuery;

  // Aggregation to calculate average ratings
  const driverIds = drivers.map(driver => driver._id);
  const ratings = await Ratting.aggregate([
    { $match: { driver: { $in: driverIds } } },
    {
      $group: {
        _id: '$driver',
        averageRating: { $avg: '$ratting' },
      },
    },
  ]);

  // Merge ratings with drivers
  const result = drivers.map(driver => {
    const rating = ratings.find(
      r => r._id.toString() === driver._id.toString(),
    );
    return {
      ...driver.toObject(),
      averageRating: rating ? rating.averageRating : 0,
    };
  });

  const meta = await driverQuery.countTotal();

  return {
    meta,
    data: result,
  };
};

const getAllUsers = async (
  query: Record<string, unknown>,
): Promise<IGenericResponse<IUser[]>> => {
  const driverQuery = new QueryBuilder(User.find(), query)
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

// -------------------
const getOverView = async () => {};

const getSerchUser = async (name: string) => {
  const result = await User.find({ name: { $regex: new RegExp(name, 'i') } });
  return {
    data: result,
  };
};

const getSerchDriver = async (name: string) => {
  const result = await Driver.find({ name: { $regex: new RegExp(name, 'i') } });
  return {
    data: result,
  };
};

const deleteDriver = async (id: string) => {
  const result = await Driver.deleteOne({ _id: id });
  return {
    data: result,
  };
};

const deleteUser = async (id: string) => {
  const result = await User.deleteOne({ _id: id });
  return {
    data: result,
  };
};

export const DashboardService = {
  totalCount,
  getDriverGrowth,
  getAllDriver,
  getAllUsers,
  getOverView,
  getSerchUser,
  getSerchDriver,
  deleteDriver,
  deleteUser,
};
