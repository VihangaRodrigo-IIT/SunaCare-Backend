import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// One row per view event. user_id is null for guest viewers.
// Used to increment article.view_count and for per-article analytics.
export const ArticleView = sequelize.define('ArticleView', {
	id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
	article_id: { type: DataTypes.INTEGER, allowNull: false },
	user_id:    { type: DataTypes.INTEGER, allowNull: true },   // null = guest
	ip_address: { type: DataTypes.STRING(45), allowNull: true },
}, {
	tableName: 'article_views',
	underscored: true,
	updatedAt: false,  // views only need created_at
});
