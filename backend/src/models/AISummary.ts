import { Schema, model, Document, Types } from 'mongoose';

export interface IAISummary extends Document {
  teacherId:     Types.ObjectId;
  summaryText:   string;
  feedbackCount: number;
  generatedAt:   Date;
}

const AISummarySchema = new Schema<IAISummary>({
  teacherId:     { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  summaryText:   { type: String },
  feedbackCount: { type: Number },
  generatedAt:   { type: Date, default: Date.now },
});

export default model<IAISummary>('AISummary', AISummarySchema);
