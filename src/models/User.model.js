import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import bcrypt from 'bcryptjs';

export const User = sequelize.define('User', {
  id:    { type: DataTypes.INTEGER,     primaryKey: true, autoIncrement: true },
  name:  { type: DataTypes.STRING(100), allowNull: false },
  email: {
    type: DataTypes.STRING(150), allowNull: false, unique: true,
    set(v) { this.setDataValue('email', v?.toLowerCase()); },
  },
  password: { type: DataTypes.STRING(255), allowNull: false },
  role: {
    type: DataTypes.ENUM('user', 'responder', 'admin'),
    defaultValue: 'user',
  },

  // Profile
  phone:    { type: DataTypes.STRING(30),  allowNull: true },
  location: { type: DataTypes.STRING(255), allowNull: true },
  bio:      { type: DataTypes.TEXT,        allowNull: true },
  org_name: { type: DataTypes.STRING(200), allowNull: true },
  avatar:   { type: DataTypes.STRING(500), allowNull: true },

  // Link to NGO application that created this responder account (null for normal users)
  ngo_application_id: { type: DataTypes.INTEGER, allowNull: true },

  // Account status
  is_active:      { type: DataTypes.BOOLEAN, defaultValue: true },
  email_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  last_login:     { type: DataTypes.DATE,    allowNull: true },

}, {
  tableName: 'users',
  underscored: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
        user.password = await bcrypt.hash(user.password, await bcrypt.genSalt(rounds));
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
        user.password = await bcrypt.hash(user.password, await bcrypt.genSalt(rounds));
      }
    },
  },
});

User.prototype.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};
