import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole }  from '../middleware/rbac';
import TeacherAssignment from '../models/TeacherAssignment';
import Feedback         from '../models/Feedback';
import AISummary        from '../models/AISummary';
import ChatSession      from '../models/ChatSession';
import { generateAndCacheSummary } from '../services/summary';
import { chatWithTeacher }         from '../services/gemini';
import { Types }        from 'mongoose';

const router = Router();
router.use(authenticate, requireRole('teacher'));

// GET /api/teacher/me
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    // User info is already on req.user from JWT; just echo it
    res.json({ id: req.user.id, role: req.user.role });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/teacher/ratings — aggregated per-subject breakdown
router.get('/ratings', async (req: Request, res: Response): Promise<void> => {
  try {
    const assignments = await TeacherAssignment.find({ teacherId: req.user.id })
      .populate('subjectId', 'name code')
      .populate('sectionId', 'name');

    const breakdown = await Promise.all(
      assignments.map(async (a) => {
        const feedbacks = await Feedback.find({ assignmentId: a._id });
        const ratings   = feedbacks.map((f) => f.rating);
        const avg       = ratings.length
          ? ratings.reduce((s, r) => s + r, 0) / ratings.length
          : 0;

        // Build 1–10 distribution object
        const distribution: Record<number, number> = {};
        for (let i = 1; i <= 10; i++) distribution[i] = 0;
        ratings.forEach((r) => { distribution[r] = (distribution[r] ?? 0) + 1; });

        return {
          assignment:   a,
          averageRating: parseFloat(avg.toFixed(2)),
          totalCount:   feedbacks.length,
          distribution,
          comments:     feedbacks.map((f) => f.comment).filter(Boolean),
        };
      })
    );

    // Overall average across all subjects
    const allRatings = breakdown.flatMap((b) => Array(b.totalCount).fill(b.averageRating));
    const overallAvg = allRatings.length
      ? parseFloat((allRatings.reduce((s, r) => s + r, 0) / allRatings.length).toFixed(2))
      : 0;

    res.json({ breakdown, overallAverage: overallAvg, totalFeedback: allRatings.length });
  } catch (err) {
    console.error('[teacher/ratings]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/teacher/summary — cached Gemini summary
router.get('/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId    = req.user.id;
    const assignments  = await TeacherAssignment.find({ teacherId });
    const assignmentIds = assignments.map((a) => a._id);
    const currentCount = await Feedback.countDocuments({ assignmentId: { $in: assignmentIds } });

    const cached = await AISummary.findOne({ teacherId: new Types.ObjectId(teacherId) });

    // Return cache if feedback count hasn't changed since last generation
    if (cached && cached.feedbackCount === currentCount) {
      res.json({ summary: cached.summaryText, cached: true, generatedAt: cached.generatedAt });
      return;
    }

    if (currentCount === 0) {
      res.json({ summary: 'No feedback has been submitted yet.', cached: false });
      return;
    }

    const summary = await generateAndCacheSummary(teacherId);
    res.json({ summary, cached: false, generatedAt: new Date() });
  } catch (err) {
    console.error('[teacher/summary]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/teacher/chat — load chat history
router.get('/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const session = await ChatSession.findOne({ teacherId: req.user.id });
    res.json({ messages: session?.messages ?? [] });
  } catch (err) {
    console.error('[teacher/chat GET]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/teacher/chat — send message and get AI reply
router.post('/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message } = req.body;
    if (!message) { res.status(400).json({ error: 'message is required' }); return; }

    // Load or create session
    let session = await ChatSession.findOne({ teacherId: req.user.id });
    if (!session) {
      session = await ChatSession.create({ teacherId: req.user.id, messages: [] });
    }

    // Build context string from teacher's ratings for Gemini
    const assignments = await TeacherAssignment.find({ teacherId: req.user.id });
    const assignmentIds = assignments.map((a) => a._id);
    const feedbacks = await Feedback.find({ assignmentId: { $in: assignmentIds } }).select('rating comment');
    const avgRating = feedbacks.length
      ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(2)
      : 'N/A';
    const context = `Average rating: ${avgRating}/10. Total feedback: ${feedbacks.length}.`;

    session.messages.push({ role: 'user', content: message, timestamp: new Date() });

    // Call Gemini with existing history (exclude the message we just added)
    const history = session.messages.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
    const reply   = await chatWithTeacher(history, message, context);

    session.messages.push({ role: 'model', content: reply, timestamp: new Date() });
    await session.save();

    res.json({ reply });
  } catch (err) {
    console.error('[teacher/chat POST]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
