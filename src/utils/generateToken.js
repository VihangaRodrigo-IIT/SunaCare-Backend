import jwt from 'jsonwebtoken';

export const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

export const generateTokenAndSetCookie = (res, userId) => {
  const token = generateToken(userId);

  const cookieOptions = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRE || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: (process.env.JWT_COOKIE_EXPIRE || 7) * 24 * 60 * 60 * 1000,
  };

  res.cookie('token', token, cookieOptions);
  return token;
};
