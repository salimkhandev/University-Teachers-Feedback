import TeacherAssignment from '../models/TeacherAssignment';
import Feedback from '../models/Feedback';
import AISummary from '../models/AISummary';
import { generateTeacherSummary } from './gemini';
import { Types } from 'mongoose';

export async function generateAndCacheSummary(teacherId: string): Promise<string> {
  console.log(`[SummaryService] Generating summary for teacher: ${teacherId}`);
  const assignments = await TeacherAssignment.find({ teacherId });

  const assignmentIds = assignments.map((a) => a._id);

  const feedbackDocs = await Feedback.find({
    assignmentId: { $in: assignmentIds },
  }).select('comment rating');

  const comments = feedbackDocs.map((f) => f.comment).filter(Boolean);
  const ratings  = feedbackDocs.map((f) => f.rating);
  const feedbackCount = feedbackDocs.length;

  const summaryText = await generateTeacherSummary(comments, ratings);

  await AISummary.findOneAndUpdate(
    { teacherId: new Types.ObjectId(teacherId) },
    {
      summaryText,
      feedbackCount,
      generatedAt: new Date(),
    },
    { upsert: true }
  );

  return summaryText;
}
