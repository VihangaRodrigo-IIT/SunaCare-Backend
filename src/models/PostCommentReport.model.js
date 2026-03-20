import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const PostCommentReport = sequelize.define('PostCommentReport', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  comment_id:  { type: DataTypes.INTEGER, allowNull: false },
  reporter_id: { type: DataTypes.INTEGER, allowNull: false },
  reason:      { type: DataTypes.STRING(120), allowNull: false, defaultValue: 'other' },
  details:     { type: DataTypes.STRING(500), allowNull: true },
  created_at:  { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'post_comment_reports',
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false,
});
