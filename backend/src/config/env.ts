import dotenv from 'dotenv';
dotenv.config();

const required = ['PORT', 'MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'GEMINI_API_KEY'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env variable: ${key}`);
  }
}

export const ENV = {
  PORT:               process.env.PORT!,
  MONGO_URI:          process.env.MONGO_URI!,
  JWT_SECRET:         process.env.JWT_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  GEMINI_API_KEY:     process.env.GEMINI_API_KEY!,
};
