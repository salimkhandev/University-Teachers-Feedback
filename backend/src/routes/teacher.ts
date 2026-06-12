import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole }  from '../middleware/rbac';
import TeacherAssignment from '../models/TeacherAssignment';
import Feedback         from '../models/Feedback';
import AISummary        from '../models/AISummary';
import ChatSession      from '../models/ChatSession';
import { generateAndCacheSummary } from '../services/summary';
import { chatWithTeacher, summarizeChatHistory } from '../services/gemini';
import { Types }        from 'mongoose';

const router = Router();
router.use(authenticate, requireRole('teacher'));
const summaryRetryAfterByTeacher = new Map<string, number>();
const DEFAULT_SUMMARY_RETRY_MS = 60_000;

const parseRetryDelayMs = (err: any): number => {
  const retryInfo = Array.isArray(err?.errorDetails)
    ? err.errorDetails.find((d: any) => String(d?.['@type'] || '').includes('RetryInfo'))
    : null;
  const retryDelay = String(retryInfo?.retryDelay || '').trim();
  const match = retryDelay.match(/^(\d+)(ms|s|m)$/i);
  if (!match) return DEFAULT_SUMMARY_RETRY_MS;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 'ms') return value;
  if (unit === 'm') return value * 60_000;
  return value * 1_000;
};

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

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    const cached = await AISummary.findOne({ teacherId: new Types.ObjectId(teacherId) });

    const force = String(req.query.force).toLowerCase() === 'true';

    console.log(`[Teacher Summary API] Fetching summary for teacher ${teacherId}. force=${force}, currentCount=${currentCount}, cachedCount=${cached?.feedbackCount}`);

    // Return cache if feedback count hasn't changed since last generation and we aren't forcing a refresh
    if (cached && cached.feedbackCount === currentCount && !force) {
      console.log(`[Teacher Summary API] Serving cached summary to teacher ${teacherId}.`);
      res.json({ summary: cached.summaryText, cached: true, generatedAt: cached.generatedAt, isStale: false, noCache: false });
      return;
    }

    if (currentCount === 0) {
      console.log(`[Teacher Summary API] No feedback exists for teacher ${teacherId}.`);
      res.json({ summary: 'No feedback has been submitted yet.', cached: false, isStale: false, noCache: true });
      return;
    }

    // Stale Cache Case: If we have cache but feedback count changed, and user didn't force generate
    if (cached && !force) {
      console.log(`[Teacher Summary API] Serving stale cached summary to teacher ${teacherId}.`);
      res.json({
        summary: cached.summaryText,
        cached: true,
        generatedAt: cached.generatedAt,
        isStale: true,
        noCache: false
      });
      return;
    }

    // No Cache Case: If we have no cache and user didn't force generate
    if (!cached && !force) {
      console.log(`[Teacher Summary API] No cached summary exists for teacher ${teacherId} and force is false.`);
      res.json({
        summary: 'No summary has been generated yet.',
        cached: false,
        isStale: false,
        noCache: true
      });
      return;
    }

    console.log(`[Teacher Summary API] Force or new summary requested. Generating real-time summary for teacher ${teacherId}...`);

    const retryAfterTs = summaryRetryAfterByTeacher.get(teacherId) ?? 0;
    if (Date.now() < retryAfterTs) {
      const retryAfterSeconds = Math.ceil((retryAfterTs - Date.now()) / 1000);
      const fallbackSummary = cached?.summaryText ?? 'Summary generation is temporarily paused due to AI quota. Please try again shortly.';
      res.status(429).json({
        error: `AI quota cooldown active. Retry in ${retryAfterSeconds}s.`,
        retryAfterSeconds,
        quotaLimited: true,
        summary: fallbackSummary,
        cached: Boolean(cached),
        generatedAt: cached?.generatedAt ?? null,
      });
      return;
    }

    const summary = await generateAndCacheSummary(teacherId);
    res.json({ summary, cached: false, generatedAt: new Date(), isStale: false, noCache: false });
  } catch (err: any) {
    if (String(err?.message || '').includes('No Gemini API key configured')) {
      res.status(400).json({ error: 'AI key is not configured. Ask admin to add a Gemini key in Admin > AI Settings.' });
      return;
    }
    if (String(err?.message || '').includes('All configured Gemini keys are invalid')) {
      res.status(400).json({ error: 'Configured AI keys are invalid. Ask admin to renew/add a valid key in Admin > AI Settings.' });
      return;
    }
    if (err?.status === 429) {
      const teacherId = req.user.id;
      const cooldownMs = parseRetryDelayMs(err);
      summaryRetryAfterByTeacher.set(teacherId, Date.now() + cooldownMs);

      const cached = await AISummary.findOne({ teacherId: new Types.ObjectId(teacherId) });
      const retryAfterSeconds = Math.ceil(cooldownMs / 1000);
      const fallbackSummary = cached?.summaryText ?? 'Summary generation is currently rate-limited. Please try again after cooldown.';
      res.status(429).json({
        error: `AI quota exceeded. Retry in ${retryAfterSeconds}s.`,
        retryAfterSeconds,
        quotaLimited: true,
        summary: fallbackSummary,
        cached: Boolean(cached),
        generatedAt: cached?.generatedAt ?? null,
      });
      return;
    }
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

// GET /api/teacher/chat/bootstrap — single request for chat + cached summary (no AI generation)
router.get('/chat/bootstrap', async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.user.id;

    const session = await ChatSession.findOne({ teacherId });
    const assignments = await TeacherAssignment.find({ teacherId }).select('_id');
    const assignmentIds = assignments.map((a) => a._id);
    const currentCount = await Feedback.countDocuments({ assignmentId: { $in: assignmentIds } });
    const cached = await AISummary.findOne({ teacherId: new Types.ObjectId(teacherId) });

    const fallbackSummary = currentCount === 0
      ? 'No feedback has been submitted yet.'
      : 'Summary is not generated yet. Open "AI Summary" or refresh there once to generate it.';

    res.json({
      messages: session?.messages ?? [],
      summary: cached?.summaryText ?? fallbackSummary,
      summaryCached: Boolean(cached),
      summaryFresh: Boolean(cached && cached.feedbackCount === currentCount),
      generatedAt: cached?.generatedAt ?? null,
    });
  } catch (err) {
    console.error('[teacher/chat/bootstrap GET]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/teacher/chat — send message and get AI reply
router.post('/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message } = req.body;
    if (!message) { res.status(400).json({ error: 'message is required' }); return; }
    if (String(message).length > 1000) { res.status(400).json({ error: 'Message payload too large.' }); return; }

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

    const validComments = feedbacks.map((f) => f.comment).filter(Boolean);
    const commentsList = validComments.length > 0
      ? validComments.map((c, i) => `${i + 1}. "${c}"`).join('\n')
      : 'No comments provided by students.';

    const context = `SYSTEM ROLE: You are a personal AI teaching coach talking to this exact teacher (the logged-in user). This conversation is from the teacher whose students submitted the feedback below.

TEACHER FEEDBACK DATA:
Average rating: ${avgRating}/10
Total feedback: ${feedbacks.length}

STUDENT COMMENTS:
${commentsList}

INSTRUCTION:
Answer in teacher mode. Coach the teacher directly, suggest practical improvements, and keep responses concise and actionable.`;

    session.messages.push({ role: 'user', content: message, timestamp: new Date() });

    // Build history and apply compaction/truncation for scalable context windows.
    let recentHistory = session.messages
      .slice(0, -1)
      .map((m) => ({ role: m.role, content: m.content }));

    const historyLength = recentHistory.reduce((acc, msg) => acc + (msg.content?.length || 0), 0);
    if (historyLength > 3000) {
      const summaryText = await summarizeChatHistory(recentHistory);
      recentHistory = [{ role: 'user', content: `[SYSTEM: PREVIOUS CHAT COMPACTED]\nWe previously established:\n${summaryText}` }];
    } else {
      recentHistory = recentHistory.slice(-5);
    }

    const result = await chatWithTeacher(recentHistory, message, context);

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    let fullReply = '';
    for await (const chunk of result.stream) {
      const text = chunk.text();
      fullReply += text;
      res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
    }

    session.messages.push({ role: 'model', content: fullReply, timestamp: new Date() });
    await session.save();

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    if (res.headersSent) {
      try {
        res.write(`data: ${JSON.stringify({ error: err?.message || 'Streaming error' })}\n\n`);
        res.end();
      } catch (streamErr) {
        console.error('[teacher/chat stream error handling]', streamErr);
      }
      return;
    }
    if (String(err?.message || '').includes('No Gemini API key configured')) {
      res.status(400).json({ error: 'AI key is not configured. Ask admin to add a Gemini key in Admin > AI Settings.' });
      return;
    }
    if (String(err?.message || '').includes('All configured Gemini keys are invalid')) {
      res.status(400).json({ error: 'Configured AI keys are invalid. Ask admin to renew/add a valid key in Admin > AI Settings.' });
      return;
    }
    console.error('[teacher/chat POST]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
