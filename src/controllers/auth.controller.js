import jwt from 'jsonwebtoken';
import { User, OtpVerification } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateToken } from '../utils/generateToken.js';

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (await User.findOne({ where: { email: email.toLowerCase() } })) {
    return res.status(400).json({ success: false, message: 'Email already registered' });
  }

  const user = await User.create({ name, email, password, role: 'user' });
  const token = generateToken(user.id, user.role);

  res.status(201).json({
    success: true,
    token,
    user: sanitizeUser(user),
  });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ where: { email: email.toLowerCase() } });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }
  if (!user.is_active) {
    return res.status(403).json({ success: false, message: 'Account has been deactivated' });
  }

  await user.update({ last_login: new Date() });
  const token = generateToken(user.id, user.role);

  res.json({ success: true, token, user: sanitizeUser(user) });
});

// POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out' });
});

// POST /api/auth/refresh
export const refresh = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id);
  if (!user || !user.is_active) {
    return res.status(401).json({ success: false, message: 'User not found or inactive' });
  }
  const token = generateToken(user.id, user.role);
  res.json({ success: true, token, user: sanitizeUser(user) });
});

// POST /api/auth/send-otp
export const sendOtp = asyncHandler(async (req, res) => {
  const { identifier, type = 'email_verification' } = req.body;
  if (!identifier) return res.status(400).json({ success: false, message: 'identifier is required' });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  // Invalidate previous unused OTPs for same identifier+type
  await OtpVerification.update(
    { is_used: true },
    { where: { identifier, type, is_used: false } }
  );

  await OtpVerification.create({ identifier, otp_code: code, type, expires_at });

  // TODO: send email/SMS — for now return code in dev only
  const payload = { success: true, message: 'OTP sent' };
  if (process.env.NODE_ENV !== 'production') payload.debug_otp = code;

  res.json(payload);
});

// POST /api/auth/verify-otp
export const verifyOtp = asyncHandler(async (req, res) => {
  const { identifier, otp_code, type = 'email_verification' } = req.body;
  if (!identifier || !otp_code) {
    return res.status(400).json({ success: false, message: 'identifier and otp_code are required' });
  }

  const otp = await OtpVerification.findOne({
    where: { identifier, otp_code, type, is_used: false },
    order: [['created_at', 'DESC']],
  });

  if (!otp || new Date() > otp.expires_at) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
  }

  await otp.update({ is_used: true });

  // Mark user as email verified if relevant
  if (type === 'email_verification') {
    await User.update({ email_verified: true }, { where: { email: identifier } });
  }

  res.json({ success: true, message: 'OTP verified' });
});

// ─── Helper ──────────────────────────────────────────────────────────────────
function sanitizeUser(user) {
  const { password, ...rest } = user.toJSON();
  return rest;
}

// GET /api/auth/me  (alias for /users/me — used by admin settings)
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id, { attributes: { exclude: ['password'] } });
  res.json({ success: true, data: { user } });
});

// POST /api/auth/change-password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'currentPassword and newPassword are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
  }

  const user = await User.findByPk(req.user.id);
  if (!user || !(await user.comparePassword(currentPassword))) {
    return res.status(401).json({ success: false, message: 'Current password is incorrect' });
  }

  await user.update({ password: newPassword });
  res.json({ success: true, message: 'Password changed successfully' });
});
