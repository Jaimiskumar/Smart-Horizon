import express from 'express';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import { createAccessToken, createRefreshToken, hashToken, verifyRefreshToken } from '../utils/tokens.js';
import { getPermissionsForRole } from '../utils/permissions.js';

const router = express.Router();

async function issueTokens(user, req) {
  const permissions = getPermissionsForRole(user.role);
  const accessToken = createAccessToken({
    userId: user._id.toString(),
    role: user.role,
    permissions
  });

  const refreshToken = createRefreshToken({
    userId: user._id.toString(),
    role: user.role
  });

  const decodedRefresh = verifyRefreshToken(refreshToken);
  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(decodedRefresh.exp * 1000),
    createdByIp: req.ip,
    userAgent: req.get('user-agent')
  });

  return { accessToken, refreshToken, permissions };
}

function userPayload(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    vehicleNumber: user.vehicleNumber
  };
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, vehicleNumber } = req.body;

    if (vehicleNumber) {
      const cleanVehicleNumber = vehicleNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const plateRegex = /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/;
      if (!plateRegex.test(cleanVehicleNumber)) {
        return res.status(400).json({ message: 'Invalid vehicle number format. Must be in MH12AB1234 format.' });
      }
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Public registrations are always citizen accounts.
    const user = new User({
      name,
      email,
      password,
      role: 'citizen',
      phone,
      vehicleNumber
    });
    await user.save();

    const { accessToken, refreshToken, permissions } = await issueTokens(user, req);

    res.status(201).json({
      token: accessToken,
      accessToken,
      refreshToken,
      permissions,
      user: userPayload(user)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const { accessToken, refreshToken, permissions } = await issueTokens(user, req);

    res.json({
      token: accessToken,
      accessToken,
      refreshToken,
      permissions,
      user: userPayload(user)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (decoded.tokenType !== 'refresh') {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const tokenHash = hashToken(refreshToken);
    const storedToken = await RefreshToken.findOne({
      tokenHash,
      userId: decoded.userId,
      revokedAt: null,
      expiresAt: { $gt: new Date() }
    });

    if (!storedToken) {
      return res.status(401).json({ message: 'Refresh token expired or revoked' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    storedToken.revokedAt = new Date();
    await storedToken.save();

    const tokens = await issueTokens(user, req);

    res.json({
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      permissions: tokens.permissions
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(200).json({ message: 'Logged out' });
    }

    const tokenHash = hashToken(refreshToken);
    await RefreshToken.updateOne(
      { tokenHash, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
