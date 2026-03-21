import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const ArticleReport = sequelize.define('ArticleReport', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  article_id: { type: DataTypes.INTEGER, allowNull: false },
  reported_by: { type: DataTypes.INTEGER, allowNull: true },
  reason: { type: DataTypes.STRING(120), allowNull: false },
  details: { type: DataTypes.TEXT, allowNull: true },
  reporter_name: { type: DataTypes.STRING(120), allowNull: true },
  reporter_email: { type: DataTypes.STRING(160), allowNull: true },
  status: {
    type: DataTypes.ENUM('pending', 'reviewed', 'dismissed'),
    allowNull: false,
    defaultValue: 'pending',
  },
  admin_note: { type: DataTypes.TEXT, allowNull: true },
  action_taken: {
    type: DataTypes.ENUM('none', 'remove_article', 'revoke_author', 'dismiss'),
    allowNull: false,
    defaultValue: 'none',
  },
  reviewed_by: { type: DataTypes.INTEGER, allowNull: true },
  reviewed_at: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'article_reports',
  underscored: true,
});
