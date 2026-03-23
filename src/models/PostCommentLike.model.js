import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const PostCommentLike = sequelize.define('PostCommentLike', {
  id:         { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  comment_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  user_id:    { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
}, {
  tableName: 'post_comment_likes',
  underscored: true,
  timestamps: false,
});