import { Schema, model, Document, Types } from 'mongoose';

export interface IFeedback extends Document {
  studentId:    Types.ObjectId;
  assignmentId: Types.ObjectId;
  rating:       number;
  comment:      string;
  version:      number;
  createdAt:    Date;
  updatedAt:    Date;
}

const FeedbackSchema = new Schema<IFeedback>({
  studentId:    { type: Schema.Types.ObjectId, ref: 'Student',          required: true },
  assignmentId: { type: Schema.Types.ObjectId, ref: 'TeacherAssignment', required: true },
  rating:       { type: Number, min: 1, max: 10, required: true },
  comment:      { type: String, default: '' },
  version:      { type: Number, default: 1 },
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now },
});

// One feedback per student per assignment — the core uniqueness constraint
FeedbackSchema.index({ studentId: 1, assignmentId: 1 }, { unique: true });

export default model<IFeedback>('Feedback', FeedbackSchema);
