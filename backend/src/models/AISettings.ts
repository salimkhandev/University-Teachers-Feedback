import { Schema, model, Document } from 'mongoose';

export type GeminiModelOption = 'gemini-2.5-flash' | 'gemini-2.5-flash-lite';

interface IAPIKey {
  label: string;
  apiKey: string;
  isActive: boolean;
  lastUsedAt?: Date;
  lastFailedAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAISettings extends Document {
  selectedModel: GeminiModelOption;
  keys: IAPIKey[];
}

const APIKeySchema = new Schema<IAPIKey>(
  {
    label: { type: String, required: true, trim: true },
    apiKey: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    lastUsedAt: { type: Date },
    lastFailedAt: { type: Date },
    lastError: { type: String, default: '' },
  },
  { timestamps: true }
);

const AISettingsSchema = new Schema<IAISettings>(
  {
    selectedModel: {
      type: String,
      enum: ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
      default: 'gemini-2.5-flash-lite',
    },
    keys: { type: [APIKeySchema], default: [] },
  },
  { timestamps: true }
);

export default model<IAISettings>('AISettings', AISettingsSchema);
