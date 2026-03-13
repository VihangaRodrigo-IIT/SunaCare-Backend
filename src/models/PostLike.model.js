import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const PostLike = sequelize.define('PostLike', {
  id:      { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  post_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'post_likes',
  underscored: true,
  indexes: [{ unique: true, fields: ['post_id', 'user_id'] }],
});
