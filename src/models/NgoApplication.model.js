import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const NgoApplication = sequelize.define('NgoApplication', {
	id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

	// Contact person (submitter)
	contact_name: { type: DataTypes.STRING(100), allowNull: false },
	email:        { type: DataTypes.STRING(150), allowNull: false, set(v) { this.setDataValue('email', v?.toLowerCase()); } },
	phone:        { type: DataTypes.STRING(30),  allowNull: true },

	// Organisation
	org_name:           { type: DataTypes.STRING(200), allowNull: false },
	org_type:           { type: DataTypes.ENUM('ngo', 'vet', 'shelter', 'rescue'), defaultValue: 'ngo' },
	org_address:        { type: DataTypes.TEXT,        allowNull: true },
	org_description:    { type: DataTypes.TEXT,        allowNull: true },
	registration_no:    { type: DataTypes.STRING(100), allowNull: true },
	document_url:       { type: DataTypes.STRING(500), allowNull: true },
	coverage_radius_km: { type: DataTypes.INTEGER,     allowNull: true },

	// Admin review
	approval_status: {
		type: DataTypes.ENUM('pending', 'approved', 'rejected'),
		defaultValue: 'pending',
	},
	review_note: { type: DataTypes.TEXT,    allowNull: true },
	reviewed_by: { type: DataTypes.INTEGER, allowNull: true },
	reviewed_at: { type: DataTypes.DATE,    allowNull: true },

	// Live map pin controls
	latitude:         { type: DataTypes.DECIMAL(10, 7), allowNull: true },
	longitude:        { type: DataTypes.DECIMAL(10, 7), allowNull: true },
	map_pinned:       { type: DataTypes.BOOLEAN, defaultValue: false },
	show_on_user_map: { type: DataTypes.BOOLEAN, defaultValue: true },
	pinned_by:        { type: DataTypes.INTEGER, allowNull: true },

}, { tableName: 'ngo_applications', underscored: true });
