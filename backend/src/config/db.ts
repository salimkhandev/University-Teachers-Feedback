import mongoose from 'mongoose';

// Cache the connection across serverless function invocations (avoids connection pool exhaustion)
let cached: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } = { conn: null, promise: null };

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not defined in environment');

  // Return existing connection immediately
  if (cached.conn) return;

  // Reuse in-flight connection promise if already connecting
  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // fail fast on cold start rather than hang
      socketTimeoutMS: 45000,
    });
  }

  cached.conn = await cached.promise;
  console.log('✅ MongoDB connected');
};
