/**
 * Environment configuration module
 * Reads and defaults environment variables cleanly
 */
export const config = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  adminKey: process.env.ADMIN_KEY || 'admin123',
  isDev: (process.env.NODE_ENV || 'development') === 'development'
};
