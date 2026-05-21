import dotenv from 'dotenv';
dotenv.config(); // loads .env in local dev; no-op on Vercel

export const ENV = {
  PORT:               process.env.PORT || '5000',
  MONGO_URI:          process.env.MONGO_URI || '',
  JWT_SECRET:         process.env.JWT_SECRET || '',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || '',
  GEMINI_API_KEY:     process.env.GEMINI_API_KEY || '',
};