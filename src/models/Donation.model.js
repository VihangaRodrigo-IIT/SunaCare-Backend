import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Donation = sequelize.define('Donation', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  campaign_id:  { type: DataTypes.INTEGER, allowNull: false },
  donor_id:     { type: DataTypes.INTEGER, allowNull: true },  // null = anonymous / not logged in
  amount:       { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  message:      { type: DataTypes.TEXT,    allowNull: true },
  is_anonymous: { type: DataTypes.BOOLEAN, defaultValue: false },
  payment_method: { type: DataTypes.ENUM('bank_transfer'), defaultValue: 'bank_transfer' },
  donor_name:     { type: DataTypes.STRING(100), allowNull: true },
  bank_reference: { type: DataTypes.STRING(120), allowNull: true },
  receipt_url:    { type: DataTypes.TEXT('medium'), allowNull: true },
  receipt_name:   { type: DataTypes.STRING(255), allowNull: true },
}, { tableName: 'donations', underscored: true });