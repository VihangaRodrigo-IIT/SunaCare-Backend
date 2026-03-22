import { User, OtpVerification } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateToken } from '../utils/generateToken.js';
import { sendOtpEmail } from '../utils/mailer.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!email || !EMAIL_REGEX.test(email.toLowerCase())) {
    return res.status(400).json({ success: false, message: 'A valid email is required' });
  }

  if (await User.findOne({ where: { email: email.toLowerCase() } })) {
    return res.status(400).json({ success: false, message: 'Email already registered' });
  }

  // Check if email has been verified via OTP
  const normalizedEmail = email.toLowerCase();
  const verifiedOtp = await OtpVerification.findOne({
    where: { identifier: normalizedEmail, type: 'email_verification', is_used: true },
    order: [['created_at', 'DESC']],
  });

  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
    role: 'user',
    email_verified: !!verifiedOtp, // Set to true if OTP was verified
  });

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

  const normalizedIdentifier = String(identifier).trim().toLowerCase();
  if (!normalizedIdentifier) {
    return res.status(400).json({ success: false, message: 'identifier is required' });
  }

  if (type === 'email_verification' && !EMAIL_REGEX.test(normalizedIdentifier)) {
    return res.status(400).json({ success: false, message: 'A valid email is required' });
  }

  // Check if email is already registered (for signup/email verification)
  if (type === 'email_verification') {
    const existingUser = await User.findOne({ where: { email: normalizedIdentifier } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered. Please sign in instead.' });
    }
  }

  // Validate email format for password_reset
  if (type === 'password_reset' && !EMAIL_REGEX.test(normalizedIdentifier)) {
    return res.status(400).json({ success: false, message: 'A valid email is required' });
  }

  // Check if user exists (for password reset)
  if (type === 'password_reset') {
    const user = await User.findOne({ where: { email: normalizedIdentifier } });
    if (!user) {
      return res.status(400).json({ success: false, message: 'No account found with this email address.' });
    }
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  // Invalidate previous unused OTPs for same identifier+type
  await OtpVerification.update(
    { is_used: true },
    { where: { identifier: normalizedIdentifier, type, is_used: false } }
  );

  // Create new OTP record
  await OtpVerification.create({
    identifier: normalizedIdentifier,
    otp_code: code,
    type,
    expires_at,
  });

  // Send email with OTP
  const emailResult = await sendOtpEmail({ to: normalizedIdentifier, code, expiresInMinutes: 10 });

  if (!emailResult.sent && process.env.NODE_ENV === 'production') {
    return res.status(503).json({
      success: false,
      message: 'Unable to send OTP email. Please try again later.',
    });
  }

  const payload = { success: true, message: 'OTP sent' };
  payload.delivery = emailResult.sent ? 'email' : 'debug';
  if (process.env.NODE_ENV !== 'production') payload.debug_otp = code;

  res.json(payload);
});

// POST /api/auth/verify-otp
export const verifyOtp = asyncHandler(async (req, res) => {
  const { identifier, otp_code, type = 'email_verification' } = req.body;
  if (!identifier || !otp_code) {
    return res.status(400).json({ success: false, message: 'identifier and otp_code are required' });
  }

  const normalizedIdentifier = String(identifier).trim().toLowerCase();

  const otp = await OtpVerification.findOne({
    where: { identifier: normalizedIdentifier, otp_code: String(otp_code).trim(), type, is_used: false },
    order: [['created_at', 'DESC']],
  });

  if (!otp || new Date() > otp.expires_at) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
  }

  // For password reset flow, keep OTP usable until final password update.
  if (type !== 'password_reset') {
    await otp.update({ is_used: true });
  }

  // If user exists and this is email verification, mark them as verified
  if (type === 'email_verification') {
    const user = await User.findOne({ where: { email: normalizedIdentifier } });
    if (user) {
      await user.update({ email_verified: true });
    }
  }

  res.json({ success: true, message: 'OTP verified' });
  });

  // POST /api/auth/reset-password
  export const resetPassword = asyncHandler(async (req, res) => {
    const { email, otp_code, newPassword } = req.body;

    if (!email || !otp_code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'email, otp_code, and newPassword are required',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Find and validate OTP
    const otp = await OtpVerification.findOne({
      where: {
        identifier: normalizedEmail,
        otp_code: String(otp_code).trim(),
        type: 'password_reset',
        is_used: false,
      },
      order: [['created_at', 'DESC']],
    });

    if (!otp || new Date() > otp.expires_at) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Find user and update password
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    // Mark OTP as used
    await otp.update({ is_used: true });

    // Update user password
    await user.update({ password: newPassword });

    res.json({ success: true, message: 'Password reset successfully' });
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
