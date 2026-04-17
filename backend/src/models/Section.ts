import { Schema, model, Document, Types } from 'mongoose';

export interface ISection extends Document {
  semesterId: Types.ObjectId;
  name: string;
}

const SectionSchema = new Schema<ISection>({
  semesterId: { type: Schema.Types.ObjectId, ref: 'Semester', required: true },
  name:       { type: String, required: true },
});

export default model<ISection>('Section', SectionSchema);
