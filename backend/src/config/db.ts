import mongoose from 'mongoose';

// Cache the connection across serverless function invocations (avoids connection pool exhaustion)
let cached: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } = { conn: null, promise: null };

// Disable Mongoose buffering globally so queries fail fast instead of timing out
mongoose.set('bufferTimeoutMS', 0);

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not defined in environment');

  // If we have a cached connection, verify the underlying connection is still alive
  if (cached.conn) {
    // readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    if (mongoose.connection.readyState === 1) {
      return; // Connection is healthy, use it
    }
    // Connection is stale/dropped — reset and reconnect
    console.log('⚠️ Cached connection is stale (readyState=' + mongoose.connection.readyState + '). Reconnecting...');
    cached.conn = null;
    cached.promise = null;
  }

  // Reuse in-flight connection promise if already connecting
  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000, // 10s for Vercel cold starts
      socketTimeoutMS: 45000,
    });
  }

  try {
    cached.conn = await cached.promise;
    console.log('✅ MongoDB connected');
  } catch (err) {
    // Reset promise so next attempt retries connecting
    cached.promise = null;
    console.error('❌ MongoDB connection failed:', err);
    throw err;
  }
};