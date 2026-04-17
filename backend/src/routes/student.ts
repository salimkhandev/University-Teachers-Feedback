import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole }  from '../middleware/rbac';
import Student          from '../models/Student';
import TeacherAssignment from '../models/TeacherAssignment';
import Feedback         from '../models/Feedback';

const router = Router();
router.use(authenticate, requireRole('student'));

// GET /api/student/me
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    const student = await Student.findOne({ userId: req.user.id })
      .populate('sectionId')
      .populate('semesterId');
    if (!student) { res.status(404).json({ error: 'Student profile not found' }); return; }
    res.json(student);
  } catch (err) {
    console.error('[student/me]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/student/assignments — teacher assignments for this student's section/semester with feedback status
router.get('/assignments', async (req: Request, res: Response): Promise<void> => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) { res.status(404).json({ error: 'Student profile not found' }); return; }

    const assignments = await TeacherAssignment.find({
      sectionId:  student.sectionId,
      semesterId: student.semesterId,
    })
      .populate('teacherId', 'name email')
      .populate('subjectId', 'name code');

    // Attach feedback submission status without a boolean field — null means not submitted
    const withStatus = await Promise.all(
      assignments.map(async (a) => {
        const feedback = await Feedback.findOne({
          studentId:    student._id,
          assignmentId: a._id,
        });
        return {
          ...a.toObject(),
          feedbackSubmitted: feedback !== null,
          feedbackId:        feedback?._id ?? null,
          feedbackVersion:   feedback?.version ?? null,
          currentRating:     feedback?.rating ?? null,
          currentComment:    feedback?.comment ?? null,
        };
      })
    );

    res.json(withStatus);
  } catch (err) {
    console.error('[student/assignments]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
