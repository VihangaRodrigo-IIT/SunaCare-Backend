import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Article = sequelize.define('Article', {
	id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
	title:        { type: DataTypes.STRING(255), allowNull: false },
	summary:      { type: DataTypes.TEXT,        allowNull: true },
	content:      { type: DataTypes.TEXT('long'), allowNull: false },
	category:     { type: DataTypes.STRING(100), allowNull: true },
	tags: {
		type: DataTypes.TEXT, allowNull: true,
		get() { try { return JSON.parse(this.getDataValue('tags') || '[]'); } catch { return []; } },
		set(v) { this.setDataValue('tags', v ? JSON.stringify(v) : null); },
	},
	cover_url:      { type: DataTypes.STRING(500), allowNull: true },
	read_time_min:  { type: DataTypes.INTEGER,     allowNull: true },
	status:         { type: DataTypes.ENUM('draft', 'published'), defaultValue: 'draft' },
	author_id:      { type: DataTypes.INTEGER, allowNull: false },
	display_author_name: { type: DataTypes.STRING(255), allowNull: true },
	view_count:     { type: DataTypes.INTEGER, defaultValue: 0 },
	published_at:   { type: DataTypes.DATE,    allowNull: true },
}, { tableName: 'articles', underscored: true });
