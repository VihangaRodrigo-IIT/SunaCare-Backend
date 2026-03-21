import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
//hi
//Hello
export const AdoptionApplication = sequelize.define('AdoptionApplication', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  pet_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'pets', key: 'id' },
  },
  applicant_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
  },
}, {
  tableName: 'adoption_applications',
  indexes: [
    { fields: ['pet_id'] },
    { fields: ['applicant_id'] },
    { fields: ['status'] },
  ],
});
