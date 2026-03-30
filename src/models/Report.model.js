import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Report = sequelize.define('Report', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  report_number: { type: DataTypes.STRING(20), allowNull: true, unique: true },

  // Animal details
  category:     { type: DataTypes.ENUM('cat', 'dog', 'other'), allowNull: false },
  issue:        { type: DataTypes.STRING(255), allowNull: false },
  description:  { type: DataTypes.TEXT,        allowNull: true },
  animal_count: { type: DataTypes.INTEGER,     defaultValue: 1 },
  tags: {
    type: DataTypes.TEXT, allowNull: true,
    get() { try { return JSON.parse(this.getDataValue('tags') || '[]'); } catch { return []; } },
    set(v) { this.setDataValue('tags', v ? JSON.stringify(v) : null); },
  },
  urgency: { type: DataTypes.ENUM('low', 'medium', 'urgent'), defaultValue: 'medium' },
  status:  { type: DataTypes.ENUM('pending', 'in-treatment', 'rescued', 'closed'), defaultValue: 'pending' },

  // Location
  lat:      { type: DataTypes.DECIMAL(10, 7), allowNull: true },
  lng:      { type: DataTypes.DECIMAL(10, 7), allowNull: true },
  address:  { type: DataTypes.STRING(500),    allowNull: true },
  landmark: { type: DataTypes.STRING(255),    allowNull: true },

  // Media
  media_url: { type: DataTypes.STRING(500), allowNull: true },
  media_urls: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      try {
        const raw = this.getDataValue('media_urls');
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
    set(value) {
      const urls = Array.isArray(value)
        ? value.map((item) => String(item || '').trim()).filter(Boolean)
        : [];
      this.setDataValue('media_urls', urls.length ? JSON.stringify(urls) : null);
    },
  },

  // Reporter contact — all nullable (guest or logged-in user)
  contact_name:    { type: DataTypes.STRING(100), allowNull: true },
  contact_phone:   { type: DataTypes.STRING(30),  allowNull: true },
  contact_method:  { type: DataTypes.ENUM('email', 'phone'), allowNull: true },
  contact_value:   { type: DataTypes.STRING(150), allowNull: true },
  wants_follow_up: { type: DataTypes.BOOLEAN, defaultValue: false },
  share_with_ngo:  { type: DataTypes.BOOLEAN, defaultValue: true },
  consent:         { type: DataTypes.BOOLEAN, defaultValue: false },

  // Moderation
  is_flagged: { type: DataTypes.BOOLEAN, defaultValue: false },
  flag_count: { type: DataTypes.INTEGER, defaultValue: 0 },

  // Public live-map publishing (controlled by responder/admin)
  show_on_user_map: { type: DataTypes.BOOLEAN, defaultValue: false },
  hide_media_from_public: { type: DataTypes.BOOLEAN, defaultValue: false },
  map_published_by: { type: DataTypes.INTEGER, allowNull: true },
  map_published_at: { type: DataTypes.DATE, allowNull: true },

  // Relations — both nullable (guest reports have no created_by)
  created_by:  { type: DataTypes.INTEGER, allowNull: true },
  assigned_to: { type: DataTypes.INTEGER, allowNull: true },

}, { tableName: 'reports', underscored: true });
