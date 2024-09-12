import axios from 'axios';
import config from '../../../config';

const paypal = require('@paypal/checkout-server-sdk');

function environment() {
  const payEnv = new paypal.core.SandboxEnvironment(
    config.paypal.paypal_client_id,
    config.paypal.paypal_secret_key,
  );

  return payEnv;
}

function client() {
  return new paypal.core.PayPalHttpClient(environment());
}

module.exports = { client };
