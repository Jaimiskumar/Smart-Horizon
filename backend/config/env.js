import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

const required = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const paymentProvider = (process.env.PAYMENT_PROVIDER || 'mock').toLowerCase();

if (paymentProvider === 'razorpay') {
  const paymentMissing = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET']
    .filter((key) => !process.env[key]);

  if (paymentMissing.length > 0) {
    throw new Error(
      `Missing Razorpay environment variables: ${paymentMissing.join(', ')}`
    );
  }
}

export const env = {
  NODE_ENV: nodeEnv,
  PORT: Number(process.env.PORT || 5000),
  MONGODB_URI: process.env.MONGODB_URI,
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL || '15m',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_REFRESH_TTL: process.env.JWT_REFRESH_TTL || '30d',

  PAYMENT_PROVIDER: paymentProvider,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,

  ML_BACKEND_URL: process.env.ML_BACKEND_URL || 'http://localhost:8000',
  ML_ENABLED: process.env.ML_ENABLED || 'true',
  ML_INFERENCE_TIMEOUT: Number(process.env.ML_INFERENCE_TIMEOUT || 30000),

  DEFAULT_ADMIN_EMAIL: process.env.DEFAULT_ADMIN_EMAIL || 'admin@traffic.gov',
  DEFAULT_ADMIN_PASSWORD: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
  DEFAULT_ADMIN_PHONE: process.env.DEFAULT_ADMIN_PHONE || '9999999999',
  DEFAULT_CITIZEN_EMAIL: process.env.DEFAULT_CITIZEN_EMAIL || 'citizen@example.com',
  DEFAULT_CITIZEN_PASSWORD: process.env.DEFAULT_CITIZEN_PASSWORD || 'citizen123',
  DEFAULT_CITIZEN_PHONE: process.env.DEFAULT_CITIZEN_PHONE || '9876543210'
};
