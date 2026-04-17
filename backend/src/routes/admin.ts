import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole }  from '../middleware/rbac';
import User             from '../models/User';
import TeacherAssignment from '../models/TeacherAssignment';
import Feedback         from '../models/Feedback';
import Student          from '../models/Student';
import Semester         from '../models/Semester';
import Section          from '../models/Section';
import { generateAndCacheSummary } from '../services/summary';
import { chatWithAdmin, summarizeChatHistory } from '../services/gemini';

const router = Router();
router.use(authenticate, requireRole('admin'));

// GET /api/admin/teachers/rankings
router.get('/teachers/rankings', async (req: Request, res: Response): Promise<void> => {
  try {
    const teachers = await User.find({ role: 'teacher' }, 'name email');

    const ranked = await Promise.all(
      teachers.map(async (t) => {
        const assignments   = await TeacherAssignment.find({ teacherId: t._id });
        const assignmentIds = assignments.map((a) => a._id);
        const feedbacks     = await Feedback.find({ assignmentId: { $in: assignmentIds } });
        
        const ratings       = feedbacks.map((f) => f.rating);
        const avg           = ratings.length
          ? parseFloat((ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(2))
          : 0;

        return {
          teacherId:     t._id,
          name:          t.name,
          email:         t.email,
          averageRating: avg,
          totalFeedback: ratings.length,
          summary:       null,
        };
      })
    );

    // Sort descending by average rating
    ranked.sort((a, b) => b.averageRating - a.averageRating);
    res.json(ranked);
  } catch (err) {
    console.error('[admin/rankings]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// GET /api/admin/student-tracking/:sectionId
router.get('/student-tracking/:sectionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sectionId } = req.params;
    
    // 1. Get students in this section and their user details (name, email)
    const students = await Student.find({ sectionId }).populate('userId', 'name email');
    
    // 2. Get all teacher assignments for this section, populate teacher user for names
    const assignments = await TeacherAssignment.find({ sectionId }).populate('teacherId', 'name');
    const totalAssigned = assignments.length;
    
    // 3. For each student, check their feedback
    const tracking = await Promise.all(
      students.map(async (student) => {
        const user = student.userId as any;
        const feedbacks = await Feedback.find({ studentId: student._id });
        const submittedAssignmentIds = feedbacks.map(f => f.assignmentId.toString());
        
        let submittedCount = 0;
        const missingTeacherNames: string[] = [];
        
        assignments.forEach(assignment => {
          if (submittedAssignmentIds.includes(assignment._id.toString())) {
            submittedCount++;
          } else {
            const teacherUser = assignment.teacherId as any;
            if (teacherUser && teacherUser.name) {
              missingTeacherNames.push(teacherUser.name);
            }
          }
        });
        
        return {
          id: student._id,
          name: user?.name || 'Unknown Student',
          email: user?.email || '',
          rollNumber: student.rollNumber,
          submittedCount,
          totalAssigned,
          status: submittedCount >= totalAssigned ? 'Completed' : 'Pending',
          missingTeacherNames
        };
      })
    );
    
    res.json(tracking);
  } catch (err) {
    console.error('[admin/student-tracking]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/pending-students
router.get('/pending-students', async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Fetch Students with User (for name, username, email), Section (name), Semester (name, department.name)
    const students = await Student.find()
      .populate('userId', 'name username email')
      .populate('sectionId', 'name')
      .populate({
        path: 'semesterId',
        select: 'number label departmentId',
        populate: { path: 'departmentId', select: 'name' }
      });

    // 2. Fetch all TeacherAssignments to build a map of required assignments per sectionId
    const assignments = await TeacherAssignment.find().populate('teacherId', 'name');
    
    // Group assignments by sectionId for fastest lookup
    const assignmentsBySection: Record<string, any[]> = {};
    assignments.forEach(a => {
      const secId = a.sectionId.toString();
      if (!assignmentsBySection[secId]) assignmentsBySection[secId] = [];
      assignmentsBySection[secId].push(a);
    });

    // 3. Fetch all Feedbacks globally once (avoid N+1 queries)
    const allFeedbacks = await Feedback.find();
    const feedbacksByStudent: Record<string, string[]> = {};
    allFeedbacks.forEach(f => {
      const sId = f.studentId.toString();
      if (!feedbacksByStudent[sId]) feedbacksByStudent[sId] = [];
      feedbacksByStudent[sId].push(f.assignmentId.toString());
    });

    const pendingStudents = [];
    
    // Process every student
    for (const student of students) {
      const user = student.userId as any;
      if (!user) continue;

      const secId = student.sectionId ? (student.sectionId as any)._id.toString() : '';
      const sectionAssignments = assignmentsBySection[secId] || [];
      const totalAssigned = sectionAssignments.length;
      
      const submittedIds = feedbacksByStudent[student._id.toString()] || [];

      let submittedCount = 0;
      const missingTeacherNames: string[] = [];

      sectionAssignments.forEach(assignment => {
        if (submittedIds.includes(assignment._id.toString())) {
          submittedCount++;
        } else {
          const teacherUser = assignment.teacherId as any;
          if (teacherUser && teacherUser.name) missingTeacherNames.push(teacherUser.name);
        }
      });

      const isCompleted = submittedCount >= totalAssigned;

      // If they haven't completed everything, and they actually have assignments to do, push to the pending list
      if (!isCompleted && totalAssigned > 0) {
        const semesterData = student.semesterId as any;
        const deptData = semesterData?.departmentId as any;

        pendingStudents.push({
          id: student._id,
          name: user.name,
          username: user.username,
          email: user.email || '',
          rollNumber: student.rollNumber,
          department: deptData?.name || 'Unknown Dept',
          semester: semesterData?.label || `Semester ${semesterData?.number}`,
          section: (student.sectionId as any)?.name || 'Unknown Sec',
          submittedCount,
          totalAssigned,
          missingTeacherNames
        });
      }
    }

    res.json(pendingStudents);
  } catch (err) {
    console.error('[admin/pending-students]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/report/generate/:teacherId — single teacher Gemini summary
router.post('/report/generate/:teacherId', async (req: Request, res: Response): Promise<void> => {
  const teacherId = String(req.params.teacherId);
  console.log(`[AdminRoute] Generating report for teacher ${teacherId}...`);
  try {
    const summaryText = await generateAndCacheSummary(teacherId);
    console.log(`[AdminRoute] Report generation complete for teacher ${teacherId}.`);
    res.json({ message: 'Report generation complete', summary: summaryText });
  } catch (err: any) {
    console.error(`[AdminRoute] Fetch error during report generation:`, err.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/report/status
router.get('/report/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const totalTeachers  = await User.countDocuments({ role: 'teacher' });
    const totalStudents  = await Student.countDocuments();
    const totalFeedback  = await Feedback.countDocuments();

    res.json({ totalTeachers, totalStudents, totalFeedback });
  } catch (err) {
    console.error('[admin/report/status]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/report/chat/:teacherId — chat with AI about a teacher
router.post('/report/chat/:teacherId', async (req: Request, res: Response): Promise<void> => {
  const teacherId = String(req.params.teacherId);
  const { message, history = [] } = req.body;

  if (!message) { res.status(400).json({ error: 'message is required' }); return; }
  if (message.length > 1000) { res.status(400).json({ error: 'Message payload too large.' }); return; }

  try {
    // 1. Fetch teacher's feedback to build context
    const assignments = await TeacherAssignment.find({ teacherId });
    const assignmentIds = assignments.map(a => a._id);
    const feedbacks = await Feedback.find({ assignmentId: { $in: assignmentIds } }).select('rating comment');
    
    const validComments = feedbacks.map(f => f.comment).filter(Boolean);
    const avgRating = feedbacks.length
      ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(2)
      : 'N/A';
    
    // 2. Format student comments as explicitly requested by user
    const commentsList = validComments.length > 0 
      ? validComments.map((c, i) => `${i + 1}. "${c}"`).join('\n') 
      : 'No comments provided by students.';

    const context = `SYSTEM ROLE: You are an expert University HR Performance Evaluator. Your goal is to analyze teacher feedback neutrally, professionally, and constructively for the university administration.\n\nTEACHER DATA:\nAverage rating: ${avgRating}/10. Total feedback: ${feedbacks.length}.\n\nSTUDENT COMMENTS:\n${commentsList}\n\nINSTRUCTION:\nThe Admin is asking you about this specific teacher. Use the provided student comments and data to answer their question. Keep your answer concise, formatted cleanly using Markdown (use bullet points and bold text where appropriate). Never invent or hallucinate information that is not in the comments.`;

    // 3. Size-based Truncation & Compaction
    let recentHistory = Array.isArray(history) ? history : [];
    let compactedHistory = undefined;
    
    // Calculate total character length of the current history
    const historyLength = recentHistory.reduce((acc, msg) => acc + (msg.content?.length || 0), 0);
    
    if (historyLength > 3000) {
      // Over the safe limit! Trigger the scalable summarization to compact it
      const summaryText = await summarizeChatHistory(recentHistory);
      // Create a dense new history array containing only the summary
      recentHistory = [{ role: 'user', content: `[SYSTEM: PREVIOUS CHAT COMPACTED]\nWe previously established:\n${summaryText}` }];
      compactedHistory = recentHistory;
    } else {
      // Fallback token-window truncation out of safety
      recentHistory = recentHistory.slice(-10);
    }

    // 4. Send to Gemini using the dense/recent history + the new dedicated Admin context function
    const reply = await chatWithAdmin(recentHistory, message, context);
    
    res.json({ reply, compactedHistory });
  } catch (err: any) {
    console.error(`[AdminRoute] Chat error for teacher ${teacherId}:`, err.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// GET /api/admin/student-tracking/department/:departmentId
router.get('/student-tracking/department/:departmentId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { departmentId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const semesters = await Semester.find({ departmentId }).select('_id');
    const semesterIds = semesters.map((s) => s._id);

    const sections = await Section.find({ semesterId: { $in: semesterIds } }).select('_id');
    const sectionIds = sections.map((s) => s._id);

    const totalStudents = await Student.countDocuments({ sectionId: { $in: sectionIds } });
    const students = await Student.find({ sectionId: { $in: sectionIds } })
      .populate('userId', 'name email')
      .populate({
        path: 'sectionId',
        select: 'name semesterId',
        populate: { path: 'semesterId', select: 'name' }
      })
      .skip((page - 1) * limit)
      .limit(limit);

    // Get assignments for all these sections so we can compute correct assignment counts per section
    const assignments = await TeacherAssignment.find({ sectionId: { $in: sectionIds } }).populate('teacherId', 'name');

    // Resolve exactly as the old student-tracking endpoint, but scaling across multi-section dynamic grouping
    const tracking = await Promise.all(
      students.map(async (student) => {
        const user = student.userId as any;
        const sectionObj = student.sectionId as any;
        const semesterObj = sectionObj?.semesterId as any;
        
        // Find assignments specifically for this student's section
        const studentAssignments = assignments.filter(a => String(a.sectionId) === String(sectionObj?._id));
        const totalAssigned = studentAssignments.length;

        const feedbacks = await Feedback.find({ studentId: student._id });
        const submittedAssignmentIds = feedbacks.map((f) => String(f.assignmentId));

        let submittedCount = 0;
        const missingTeacherNames: string[] = [];

        studentAssignments.forEach((assignment) => {
          if (submittedAssignmentIds.includes(String(assignment._id))) {
            submittedCount++;
          } else {
            const teacherUser = assignment.teacherId as any;
            if (teacherUser && teacherUser.name) missingTeacherNames.push(teacherUser.name);
          }
        });

        return {
          id: student._id,
          name: user?.name || 'Unknown Student',
          email: user?.email || '',
          rollNumber: student.rollNumber,
          sectionName: sectionObj?.name || 'Unknown',
          semesterName: semesterObj?.name || 'Unknown',
          submittedCount,
          totalAssigned,
          status: submittedCount >= totalAssigned ? 'Completed' : 'Pending',
          missingTeacherNames,
        };
      })
    );

    res.json({
      students: tracking,
      total: totalStudents,
      hasMore: (page * limit) < totalStudents,
    });
  } catch (err) {
    console.error('[admin/student-tracking/department]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
