import { Schema, model, Document, Types } from 'mongoose';

export interface ISemester extends Document {
  departmentId: Types.ObjectId;
  number: number;
  label?: string;
}

const SemesterSchema = new Schema<ISemester>({
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
  number:       { type: Number, required: true },
  label:        { type: String },
});

export default model<ISemester>('Semester', SemesterSchema);
