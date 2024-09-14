import { Router } from 'express';
import auth from '../../middlewares/auth';
import { ENUM_USER_ROLE } from '../../../enums/user';
import { PaymentController } from './payment.controller';

const router = Router();

router.post(
  '/payment-save',
  auth(ENUM_USER_ROLE.USER),
  PaymentController.saveTripPayment,
);

router.get(
  '/user-payments/:userId',
  auth(ENUM_USER_ROLE.USER),
  PaymentController.getUserPayment,
);

router.get(
  '/get_all_payments',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  PaymentController.getAllPayment,
);

router.post(
  '/createPaymentIntent',
  auth(ENUM_USER_ROLE.USER, ENUM_USER_ROLE.DRIVER, ENUM_USER_ROLE.ADMIN),
  PaymentController.makePaymentIntent,
);

router.get(
  '/capture/orderId',
  auth(ENUM_USER_ROLE.USER, ENUM_USER_ROLE.DRIVER, ENUM_USER_ROLE.ADMIN),
  PaymentController.capturePayment,
);

router.post(
  '/createPayoutToDriver',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN),
  PaymentController.createPayoutToDriver,
);

export const PaymentRoutes = router;
