import app from '../src/server';
import { connectDB } from '../src/config/db';

/**
 * Vercel serverless handler that ensures database connection 
 * is established before processing each request.
 * 
 * The connection is cached across invocations, so this only 
 * blocks on the first request (cold start).
 */
export default async function handler(req: any, res: any) {
  // Ensure DB is connected before handling the request
  try {
    await connectDB();
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    res.status(500).json({ error: 'Database connection failed. Check MONGO_URI configuration.' });
    return;
  }
  
  // Forward to Express app
  return app(req, res);
}