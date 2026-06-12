import { GoogleGenerativeAI, GenerateContentStreamResult } from '@google/generative-ai';
import AISettings, { GeminiModelOption } from '../models/AISettings';

type RuntimeKey = {
  id?: string;
  label: string;
  apiKey: string;
  source: 'db';
};

const DEFAULT_MODEL: GeminiModelOption = 'gemini-2.5-flash-lite';

const average = (nums: number[]): string =>
  nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : '0';

const getErrorMessage = (err: any): string =>
  String(err?.message || err?.statusText || 'Unknown Gemini error').slice(0, 280);

const isInvalidApiKeyError = (err: any): boolean => {
  const details = Array.isArray(err?.errorDetails) ? err.errorDetails : [];
  const detailFlag = details.some((d: any) => String(d?.reason || '').toUpperCase() === 'API_KEY_INVALID');
  const msgFlag = String(err?.message || '').toUpperCase().includes('API KEY NOT VALID');
  return detailFlag || msgFlag;
};

async function getRuntimeAIConfig(): Promise<{ model: GeminiModelOption; keys: RuntimeKey[] }> {
  const settings = await AISettings.findOne().lean();
  const selectedModel = (settings?.selectedModel as GeminiModelOption) || DEFAULT_MODEL;

  const dbKeys: RuntimeKey[] = (settings?.keys || [])
    .filter((k: any) => k.isActive && typeof k.apiKey === 'string' && k.apiKey.trim())
    .map((k: any) => ({
      id: String(k._id),
      label: k.label || 'Configured key',
      apiKey: String(k.apiKey).trim(),
      source: 'db' as const,
    }));

  if (dbKeys.length === 0) {
    throw new Error('No Gemini API key configured. Add one in Admin > AI Settings.');
  }

  return { model: selectedModel, keys: dbKeys };
}

async function markKeySuccess(key: RuntimeKey) {
  if (key.source !== 'db' || !key.id) return;
  await AISettings.updateOne(
    { 'keys._id': key.id },
    {
      $set: {
        'keys.$.lastUsedAt': new Date(),
        'keys.$.lastError': '',
      },
    }
  );
}

async function markKeyFailure(key: RuntimeKey, errorMessage: string) {
  if (key.source !== 'db' || !key.id) return;
  const shouldDisable = errorMessage.toUpperCase().includes('API KEY NOT VALID') || errorMessage.toUpperCase().includes('API_KEY_INVALID');
  await AISettings.updateOne(
    { 'keys._id': key.id },
    {
      $set: {
        'keys.$.lastFailedAt': new Date(),
        'keys.$.lastError': errorMessage,
        ...(shouldDisable ? { 'keys.$.isActive': false } : {}),
      },
    }
  );
}

async function runWithGemini<T>(
  systemInstruction: string | undefined,
  runner: (model: any) => Promise<T>
): Promise<T> {
  const runtime = await getRuntimeAIConfig();
  let lastErr: any = null;

  for (const key of runtime.keys) {
    try {
      const genAI = new GoogleGenerativeAI(key.apiKey);
      const model = genAI.getGenerativeModel({
        model: runtime.model,
        ...(systemInstruction ? { systemInstruction } : {}),
      });
      const result = await runner(model);
      await markKeySuccess(key);
      return result;
    } catch (err: any) {
      lastErr = err;
      await markKeyFailure(key, getErrorMessage(err));
      // Try next key if available (quota, auth, or transient error on current key).
      continue;
    }
  }

  if (lastErr && isInvalidApiKeyError(lastErr)) {
    throw new Error('All configured Gemini keys are invalid. Renew or add a valid key in Admin > AI Settings.');
  }
  throw lastErr || new Error('No Gemini key could complete this request.');
}

export async function generateTeacherSummary(
  comments: string[],
  ratings: number[]
): Promise<string> {
  const prompt = `
You are analyzing student feedback for a university teacher.
Average rating: ${average(ratings)}/10
Total responses: ${ratings.length}

Student comments:
${comments.map((c, i) => `${i + 1}. "${c}"`).join('\n')}

Write a concise, professional summary (maximum 3 to 4 lines) heavily synthesizing the overall student sentiment, key strengths, and actionable areas for improvement across all the provided comments.

Do not use paragraphs or bullet points. Keep it strictly between 3 to 4 sentences total.
Be specific. Do not invent details not present in the comments.
  `.trim();

  console.log('--- GEMINI PROMPT ---');
  console.log(prompt);

  try {
    const result = await runWithGemini(undefined, async (model) => model.generateContent(prompt));
    const responseText = result.response.text();
    console.log('--- GEMINI RESPONSE SUCCESS ---');
    console.log(responseText);
    return responseText;
  } catch (error: any) {
    console.error('=== GEMINI ERROR ===');
    console.error('Message :', error.message);
    console.error('Status  :', error.status ?? error.response?.status ?? 'N/A');
    console.error('Details :', JSON.stringify(error.errorDetails ?? error.response?.data ?? {}, null, 2));
    console.error('====================');
    throw error;
  }
}


export async function chatWithTeacher(
  messages: { role: string; content: string }[],
  newMessage: string,
  context: string
): Promise<GenerateContentStreamResult> {
  const history = messages.map((m) => ({
    role: m.role as 'user' | 'model',
    parts: [{ text: m.content }],
  }));

  const systemInstruction = `${context}

MODE: TEACHER SUPPORT
- The user is the same teacher described in the feedback context.
- Respond directly to the teacher in second person ("you").
- Focus on constructive coaching, classroom improvement, and practical next steps.
- Keep tone supportive and professional, never judgmental.
- Do not frame your response as if speaking to admins or management.
- Do not invent facts not present in provided comments/ratings.
- Keep replies concise and actionable.
- Prioritize answering the current question first.
- Use chat history only as silent background context.
- Do not mention previous messages/history unless the user explicitly asks for recap/comparison.`;

  // Start the chat session and send the message stream
  const result = await runWithGemini(systemInstruction, async (teacherModel) => {
    const chat = teacherModel.startChat({ history });
    return chat.sendMessageStream(newMessage);
  });
  return result;
}

export async function chatWithAdmin(
  messages: { role: string; content: string }[],
  newMessage: string,
  context: string
): Promise<GenerateContentStreamResult> {
  const history = messages.map((m) => ({
    role: m.role as 'user' | 'model',
    parts: [{ text: m.content }],
  }));

  const systemInstruction = context + "\n\nCRITICAL RULES:\n- Return a highly concise, to-the-point reply. Keep it very short.\n- Prioritize the latest user question over prior chat turns.\n- Treat prior history as background only.\n- Do not mention previous messages unless the admin explicitly asks for recap/comparison.";
  
  // Start the chat session and send the message stream
  const result = await runWithGemini(systemInstruction, async (adminModel) => {
    const chat = adminModel.startChat({ history });
    return chat.sendMessageStream(newMessage);
  });
  return result;
}

export async function summarizeChatHistory(
  messages: { role: string; content: string }[]
): Promise<string> {
  // Convert array of messages into a readable chat log string
  const chatLog = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  const prompt = `
Summarize the following chat history into a single, dense paragraph. 
Incorporate the core questions asked and the factual information provided by the AI.
Keep it strictly under 5 sentences.

CHAT LOG:
${chatLog}
  `.trim();

  const result = await runWithGemini(undefined, async (adminModel) => {
    const chat = adminModel.startChat({ history: [] });
    return chat.sendMessage(prompt);
  });
  return result.response.text();
}
