import dotenv from 'dotenv';
dotenv.config(); // loads .env in local dev; no-op on Vercel

export const ENV = {
  PORT:               process.env.PORT || '5000',
  MONGO_URI:          process.env.MONGO_URI ||
    'mongodb://salim:salimkhandev@ac-ah18rgg-shard-00-00.gvbqiwh.mongodb.net:27017,ac-ah18rgg-shard-00-01.gvbqiwh.mongodb.net:27017,ac-ah18rgg-shard-00-02.gvbqiwh.mongodb.net:27017/feedback_system?ssl=true&authSource=admin&retryWrites=true&w=majority',
  JWT_SECRET:         process.env.JWT_SECRET ||
    'Y7FUqFah5a6FUt3pK0HL7S/HmWEVMNx9KcxQgJKbGgKetqRpFeosA1e1BE0TEIch',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ||
    'PRrE3Xv9SappKXiFy+nzsrUeqf9/bMmCgZEnu2Mdj1+poMIA6RPG72sfHCMu5iB6soyaSigYe3A6Hu3BE2/Rpw==',
  GEMINI_API_KEY:     process.env.GEMINI_API_KEY || 'AIzaSyAtHdPLXeajOwBGtVBPKc82jY-dxjkdV5A',
};
