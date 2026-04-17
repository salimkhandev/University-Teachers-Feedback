import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  password: string;
  role: 'admin' | 'teacher' | 'student';
  name: string;
  email?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  username:  { type: String, unique: true, required: true },
  password:  { type: String, required: true },
  role:      { type: String, enum: ['admin', 'teacher', 'student'], required: true },
  name:      { type: String, required: true },
  email:     { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default model<IUser>('User', UserSchema);
