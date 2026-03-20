import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const OtpVerification = sequelize.define('OtpVerification', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  // Email or phone the OTP was sent to
  identifier: { type: DataTypes.STRING(150), allowNull: false },
  otp_code:   { type: DataTypes.STRING(6),   allowNull: false },

  type: {
    type: DataTypes.ENUM('email_verification', 'password_reset', 'phone_verification'),
    defaultValue: 'email_verification',
  },

  expires_at: { type: DataTypes.DATE,    allowNull: false },
  is_used:    { type: DataTypes.BOOLEAN, defaultValue: false },

}, { tableName: 'otp_verifications', underscored: true });
