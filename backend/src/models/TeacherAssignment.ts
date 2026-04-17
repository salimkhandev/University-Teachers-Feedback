import { Schema, model, Document, Types } from 'mongoose';

export interface ITeacherAssignment extends Document {
  teacherId:  Types.ObjectId;
  subjectId:  Types.ObjectId;
  sectionId:  Types.ObjectId;
  semesterId: Types.ObjectId;
}

const TeacherAssignmentSchema = new Schema<ITeacherAssignment>({
  teacherId:  { type: Schema.Types.ObjectId, ref: 'User',    required: true },
  subjectId:  { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  sectionId:  { type: Schema.Types.ObjectId, ref: 'Section', required: true },
  semesterId: { type: Schema.Types.ObjectId, ref: 'Semester', required: true },
});

// Prevent assigning multiple teachers to the same subject in the same section
TeacherAssignmentSchema.index(
  { subjectId: 1, sectionId: 1 },
  { unique: true }
);

export default model<ITeacherAssignment>('TeacherAssignment', TeacherAssignmentSchema);
