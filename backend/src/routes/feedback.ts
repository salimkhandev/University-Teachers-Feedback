import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole }  from '../middleware/rbac';
import Student          from '../models/Student';
import Feedback         from '../models/Feedback';
import TeacherAssignment from '../models/TeacherAssignment';

const router = Router();
router.use(authenticate, requireRole('student'));

// POST /api/feedback — submit new feedback
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { assignmentId, rating, comment } = req.body;
    if (!assignmentId || !rating) { res.status(400).json({ error: 'assignmentId and rating required' }); return; }

    const student = await Student.findOne({ userId: req.user.id });
    if (!student) { res.status(404).json({ error: 'Student profile not found' }); return; }

    const exists = await Feedback.findOne({ studentId: student._id, assignmentId });
    if (exists) { res.status(409).json({ error: 'Feedback already submitted for this assignment' }); return; }

    const feedback = await Feedback.create({
      studentId: student._id,
      assignmentId,
      rating,
      comment: comment ?? '',
      version: 1,
    });
    res.status(201).json(feedback);
  } catch (err) {
    console.error('[feedback POST]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/feedback/:id — edit existing feedback
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { rating, comment } = req.body;
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) { res.status(404).json({ error: 'Student profile not found' }); return; }

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) { res.status(404).json({ error: 'Feedback not found' }); return; }

    // Ownership check — student can only edit their own feedback
    if (feedback.studentId.toString() !== student._id.toString()) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }

    feedback.rating    = rating    ?? feedback.rating;
    feedback.comment   = comment   ?? feedback.comment;
    feedback.version  += 1;
    feedback.updatedAt = new Date();
    await feedback.save();

    res.json(feedback);
  } catch (err) {
    console.error('[feedback PATCH]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/feedback/mine — all feedback submitted by this student
router.get('/mine', async (req: Request, res: Response): Promise<void> => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) { res.status(404).json({ error: 'Student profile not found' }); return; }

    const feedbacks = await Feedback.find({ studentId: student._id })
      .populate({
        path:     'assignmentId',
        populate: [
          { path: 'teacherId', select: 'name' },
          { path: 'subjectId', select: 'name code' },
        ],
      });

    res.json(feedbacks);
  } catch (err) {
    console.error('[feedback/mine]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
