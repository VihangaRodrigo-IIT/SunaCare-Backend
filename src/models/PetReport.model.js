import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const PetReport = sequelize.define('PetReport', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  pet_id:      { type: DataTypes.INTEGER, allowNull: true },
  reported_by: { type: DataTypes.INTEGER, allowNull: true },

  reason: {
    type: DataTypes.ENUM(
      'scam_payment',
      'inappropriate_images',
      'misleading_description',
      'fake_listing',
      'suspicious_contact',
      'other'
    ),
    allowNull: false,
  },

  // Which pet listing fields the reporter flagged (stored as JSON array)
  affected_fields: {
    type: DataTypes.TEXT, allowNull: true,
    get() {
      try { return JSON.parse(this.getDataValue('affected_fields') || '[]'); }
      catch { return []; }
    },
    set(v) { this.setDataValue('affected_fields', v ? JSON.stringify(v) : null); },
  },

  details:        { type: DataTypes.TEXT,        allowNull: true },
  reporter_name:  { type: DataTypes.STRING(100), allowNull: true },
  reporter_email: { type: DataTypes.STRING(150), allowNull: true },

  status: {
    type: DataTypes.ENUM('pending', 'reviewed', 'dismissed'),
    defaultValue: 'pending',
  },

  admin_note:  { type: DataTypes.TEXT, allowNull: true },
  resolved_at: { type: DataTypes.DATE, allowNull: true },

  // Tracks which admin action resolved these reports (for history tabs)
  action_taken: {
    type: DataTypes.ENUM('delete', 'keep_pending', 'dismiss'),
    allowNull: true,
  },
  // Preserved pet name snapshot so history survives pet deletion
  pet_name_snapshot: { type: DataTypes.STRING(150), allowNull: true },

}, { tableName: 'pet_reports', underscored: true });
