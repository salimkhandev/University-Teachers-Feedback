import { Schema, model, Document, Types } from 'mongoose';

export interface IStudent extends Document {
  userId:     Types.ObjectId;
  sectionId:  Types.ObjectId;
  semesterId: Types.ObjectId;
  rollNumber: string;
  cnic?:      string;
  phone?:     string;
}

const StudentSchema = new Schema<IStudent>({
  userId:     { type: Schema.Types.ObjectId, ref: 'User',     required: true },
  sectionId:  { type: Schema.Types.ObjectId, ref: 'Section',  required: true },
  semesterId: { type: Schema.Types.ObjectId, ref: 'Semester', required: true },
  rollNumber: { type: String, unique: true },
  cnic:       { type: String, unique: true, sparse: true }, // sparse: allows multiple nulls
  phone:      { type: String },
});

export default model<IStudent>('Student', StudentSchema);
