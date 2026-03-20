import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Campaign = sequelize.define('Campaign', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title:        { type: DataTypes.STRING(255), allowNull: false },
  description:  { type: DataTypes.TEXT,        allowNull: true },
  campaign_for: { type: DataTypes.TEXT,        allowNull: true },
  category:     { type: DataTypes.STRING(100), allowNull: true },
  image:        { type: DataTypes.TEXT('medium'), allowNull: true },
  bank_name:           { type: DataTypes.STRING(150), allowNull: true },
  bank_account_name:   { type: DataTypes.STRING(180), allowNull: true },
  bank_account_number: { type: DataTypes.STRING(80),  allowNull: true },
  bank_branch:         { type: DataTypes.STRING(150), allowNull: true },
  goal_amount:  { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  raised:       { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  status:       { type: DataTypes.ENUM('draft', 'active', 'closed'), defaultValue: 'draft' },
  approval_status: { type: DataTypes.ENUM('pending', 'approved', 'discarded'), defaultValue: 'pending' },
  review_note:     { type: DataTypes.TEXT, allowNull: true },
  submitted_at:    { type: DataTypes.DATE, allowNull: true },
  reviewed_at:     { type: DataTypes.DATE, allowNull: true },
  reviewed_by:     { type: DataTypes.INTEGER, allowNull: true },
  end_date:     { type: DataTypes.DATEONLY, allowNull: true },
  created_by:   { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'campaigns', underscored: true });