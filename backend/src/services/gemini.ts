import { GoogleGenerativeAI } from '@google/generative-ai';
import { ENV } from '../config/env';

const genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

const average = (nums: number[]): string =>
  nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : '0';

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
    const result = await model.generateContent(prompt);
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
): Promise<string> {
  // Build Gemini-compatible history (must alternate user/model, start with user)
  const history = messages.map((m) => ({
    role: m.role as 'user' | 'model',
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({ history });

  // Prepend teacher context to first real message so Gemini understands the role
  const fullMessage = context
    ? `Context about this teacher's ratings:\n${context}\n\nStudent question: ${newMessage}`
    : newMessage;

  const result = await chat.sendMessage(fullMessage);
  return result.response.text();
}

export async function chatWithAdmin(
  messages: { role: string; content: string }[],
  newMessage: string,
  context: string
): Promise<string> {
  const history = messages.map((m) => ({
    role: m.role as 'user' | 'model',
    parts: [{ text: m.content }],
  }));

  const adminModel = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    systemInstruction: context + "\n\nCRITICAL RULE: Return a highly concise, to-the-point reply. Keep it very short. Do not blabber. Provide direct answers."
  });

  const chat = adminModel.startChat({ history });

  const result = await chat.sendMessage(newMessage);
  return result.response.text();
}

export async function summarizeChatHistory(
  messages: { role: string; content: string }[]
): Promise<string> {
  const adminModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

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

  const chat = adminModel.startChat({ history: [] });
  const result = await chat.sendMessage(prompt);
  return result.response.text();
}
