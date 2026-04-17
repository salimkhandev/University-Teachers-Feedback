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

// Allow any localhost port in dev (Vite uses 5173, can change)
const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, mobile apps)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
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

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB:', err);
    process.exit(1);
  });
