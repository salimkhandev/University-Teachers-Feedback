import './config/env'; // validate env vars first
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db';

import authRoutes     from './routes/auth';
import setupRoutes    from './routes/setup';
import studentRoutes  from './routes/student';
import feedbackRoutes from './routes/feedback';
import teacherRoutes  from './routes/teacher';
import adminRoutes    from './routes/admin';

const app  = express();
const PORT = process.env.PORT ?? 5000;

app.use(cors({
  origin: (origin, cb) => {
    // Allow any incoming origin dynamically to completely prevent any CORS blocks
    cb(null, true);
  },
  credentials: true,
  methods:      ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth',    authRoutes);
app.use('/api/setup',   setupRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/admin',   adminRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Connect to Database (handled asynchronously, Mongoose buffers queries)
connectDB().catch((err) => {
  console.error('❌ Failed to connect to MongoDB:', err);
});

// Start listening only in non-serverless environments (Vercel doesn't need app.listen)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
}

export default app;
