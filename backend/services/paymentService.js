import crypto from 'crypto';
import { Buffer } from 'buffer';
import { env } from '../config/env.js';

function buildRazorpayAuthHeader() {
  const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64');
  return `Basic ${auth}`;
}

export async function createRazorpayOrder({ amountPaise, receipt, notes }) {
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: buildRazorpayAuthHeader()
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: 'INR',
      receipt,
      notes
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Razorpay order creation failed: ${details}`);
  }

  return response.json();
}

export function verifyRazorpayWebhookSignature(rawBody, signature) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature || '');
  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

export function verifyRazorpayCheckoutSignature(orderId, paymentId, signature) {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET || '')
    .update(body)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature || '');
  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

export function getProviderOrderId(provider) {
  if (provider === 'razorpay') {
    return null;
  }
  return `order_mock_${Date.now()}`;
}
