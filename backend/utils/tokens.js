import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function createAccessToken(payload) {
  return jwt.sign(
    {
      ...payload,
      tokenType: 'access'
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_TTL }
  );
}

export function createRefreshToken(payload) {
  return jwt.sign(
    {
      ...payload,
      tokenType: 'refresh',
      jti: crypto.randomUUID()
    },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_TTL }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
