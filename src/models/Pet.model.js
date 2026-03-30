import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Pet = sequelize.define('Pet', {
  id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:           { type: DataTypes.STRING(100), allowNull: false },
  species:        { type: DataTypes.ENUM('dog', 'cat', 'bird', 'rabbit', 'other'), allowNull: false },
  breed:          { type: DataTypes.STRING(100), allowNull: true },
  age_years:      { type: DataTypes.INTEGER,     allowNull: true },
  age_months:     { type: DataTypes.INTEGER,     allowNull: true },
  gender:         { type: DataTypes.ENUM('male', 'female', 'unknown'), defaultValue: 'unknown' },
  size:           { type: DataTypes.ENUM('small', 'medium', 'large'), allowNull: true },
  color:          { type: DataTypes.STRING(100),  allowNull: true },
  description:    { type: DataTypes.TEXT,          allowNull: true },
  health_notes:   { type: DataTypes.TEXT,          allowNull: true },
  personality:    { type: DataTypes.TEXT,          allowNull: true },
  ideal_home:     { type: DataTypes.TEXT,          allowNull: true },
  location:       { type: DataTypes.STRING(255),   allowNull: true },
  status:         { type: DataTypes.ENUM('available', 'pending', 'adopted'), defaultValue: 'available' },
  urgent:         { type: DataTypes.BOOLEAN, defaultValue: false },
  vaccinated:     { type: DataTypes.BOOLEAN, defaultValue: false },
  neutered:       { type: DataTypes.BOOLEAN, defaultValue: false },
  microchipped:   { type: DataTypes.BOOLEAN, defaultValue: false },
  dewormed:       { type: DataTypes.BOOLEAN, defaultValue: false },
  image_url:      { type: DataTypes.TEXT('medium'), allowNull: true },
  image_urls: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    get() {
      const raw = this.getDataValue('image_urls');
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
    set(value) {
      if (!value || (Array.isArray(value) && value.length === 0)) {
        this.setDataValue('image_urls', null);
        return;
      }
      if (Array.isArray(value)) {
        this.setDataValue('image_urls', JSON.stringify(value));
        return;
      }
      this.setDataValue('image_urls', value);
    },
  },
  contact_name:   { type: DataTypes.STRING(100),   allowNull: true },
  contact_phone:  { type: DataTypes.STRING(50),    allowNull: true },
  contact_email:  { type: DataTypes.STRING(255),   allowNull: true },
  posted_by:      { type: DataTypes.INTEGER,       allowNull: true },
}, { tableName: 'pets', underscored: true });
