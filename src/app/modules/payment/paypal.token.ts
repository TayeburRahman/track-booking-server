import axios from 'axios';
import config from '../../../config';

const getAccessToken = async () => {
  const auth = Buffer.from(
    `${config.paypal.paypal_client_id}:${config.paypal.paypal_secret_key}`,
  ).toString('base64');

  const response = await axios.post(
    config.paypal.PAYPAL_BASE_URL + '/v1/oauth2/token',
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
  const token = response.data.access_token;

  return token;
};

export const paypalTokenGenerator = { getAccessToken };
