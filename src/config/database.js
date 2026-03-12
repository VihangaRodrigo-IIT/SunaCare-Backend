import 'dotenv/config';
import { Sequelize } from 'sequelize';
import { logger } from '../utils/logger.js';

// Create Sequelize instance
export const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: false,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    },
  }
);

// Test database connection
export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('MySQL database connection established successfully');

    if (process.env.NODE_ENV === 'development' && process.env.DB_SYNC === 'true') {
      await sequelize.sync({ alter: false });
      logger.info('Database models synchronized');
    }

    process.on('SIGINT', async () => {
      await sequelize.close();
      logger.info('MySQL connection closed through app termination');
      process.exit(0);
    });

    return sequelize;
  } catch (error) {
    logger.error(`Database connection error: ${error}`);
    process.exit(1);
  }
};
