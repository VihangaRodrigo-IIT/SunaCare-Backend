import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const PostComment = sequelize.define('PostComment', {
  id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  post_id:   { type: DataTypes.INTEGER, allowNull: false },
  author_id: { type: DataTypes.INTEGER, allowNull: false },
  parent_comment_id: { type: DataTypes.INTEGER, allowNull: true },
  body:      { type: DataTypes.TEXT,    allowNull: true },
  image_url: { type: DataTypes.STRING(500), allowNull: true },
  is_flagged:{ type: DataTypes.BOOLEAN, defaultValue: false },
  flag_count:{ type: DataTypes.INTEGER, defaultValue: 0 },
  hidden:    { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'post_comments', underscored: true });
