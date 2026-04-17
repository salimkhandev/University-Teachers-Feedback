import { Schema, model, Document, Types } from 'mongoose';

interface IMessage {
  role:      'user' | 'model';
  content:   string;
  timestamp: Date;
}

export interface IChatSession extends Document {
  teacherId: Types.ObjectId;
  messages:  IMessage[];
}

const ChatSessionSchema = new Schema<IChatSession>({
  teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  messages: [{
    role:      { type: String, enum: ['user', 'model'] },
    content:   { type: String },
    timestamp: { type: Date, default: Date.now },
  }],
});

export default model<IChatSession>('ChatSession', ChatSessionSchema);
