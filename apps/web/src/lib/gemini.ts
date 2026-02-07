import { GoogleGenerativeAI } from '@google/generative-ai';

// Check lazily at runtime, not at module load time
export const isGeminiConfigured = () => !!process.env.GEMINI_API_KEY;

export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenerativeAI(apiKey);
}

export async function generateCouncilResponse(
  personality: string,
  citizenName: string,
  citizenMessage: string,
  conversationHistory: Array<{ role: 'citizen' | 'council'; content: string }>
): Promise<string> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Build conversation context
  const historyText = conversationHistory
    .map((msg) => `${msg.role === 'citizen' ? citizenName : 'You'}: ${msg.content}`)
    .join('\n');

  const prompt = `${personality}

You are having a conversation with a citizen named "${citizenName}".

${historyText ? `Previous conversation:\n${historyText}\n\n` : ''}${citizenName}: ${citizenMessage}

Respond in character. Keep your response concise (2-4 sentences). Stay in character and be helpful while maintaining your personality.`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text();
}
