import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Post = sequelize.define('Post', {
  id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title:     { type: DataTypes.STRING(255), allowNull: true },
  body:      { type: DataTypes.TEXT,        allowNull: false },
  image_url: { type: DataTypes.STRING(500), allowNull: true },
  image_urls:{ type: DataTypes.TEXT('long'), allowNull: true },
  post_type: { type: DataTypes.STRING(50),  allowNull: true },
  author_id: { type: DataTypes.INTEGER,     allowNull: false },
  is_flagged:{ type: DataTypes.BOOLEAN, defaultValue: false },
  flag_count:{ type: DataTypes.INTEGER, defaultValue: 0 },
  likes:     { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'posts', underscored: true });
