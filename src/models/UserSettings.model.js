import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const UserSettings = sequelize.define('UserSettings', {
  id:      { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },

  // Notification toggles — shared by all roles
  notif_email_reports:   { type: DataTypes.BOOLEAN, defaultValue: true,  allowNull: false },
  notif_email_users:     { type: DataTypes.BOOLEAN, defaultValue: true,  allowNull: false },
  notif_email_campaigns: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
  notif_push_reports:    { type: DataTypes.BOOLEAN, defaultValue: true,  allowNull: false },
  notif_push_urgent:     { type: DataTypes.BOOLEAN, defaultValue: true,  allowNull: false },
  notif_push_system:     { type: DataTypes.BOOLEAN, defaultValue: true,  allowNull: false },

  // Responder-specific
  coverage_radius_km: { type: DataTypes.INTEGER, defaultValue: 5,          allowNull: false },
  auto_assign:        { type: DataTypes.BOOLEAN, defaultValue: false,       allowNull: false },
  routing_priority:   { type: DataTypes.ENUM('distance', 'urgency', 'animal_type'), defaultValue: 'distance', allowNull: false },
  two_factor_enabled: { type: DataTypes.BOOLEAN, defaultValue: false,       allowNull: false },
}, {
  tableName: 'user_settings',
  underscored: true,
  timestamps: false,   // DB handles updated_at via ON UPDATE CURRENT_TIMESTAMP
});
