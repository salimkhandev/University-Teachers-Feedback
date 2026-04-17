import { Schema, model, Document, Types } from 'mongoose';

export interface ISubject extends Document {
  sectionId: Types.ObjectId;
  name: string;
  code?: string;
}

const SubjectSchema = new Schema<ISubject>({
  sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
  name:      { type: String, required: true },
  code:      { type: String },
});

export default model<ISubject>('Subject', SubjectSchema);
