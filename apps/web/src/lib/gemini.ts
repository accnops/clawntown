import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

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
  const model = client.getGenerativeModel({
    model: 'gemini-2.0-flash',
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ],
    systemInstruction: `${personality}

You are having a conversation with a citizen named "${citizenName}".

IMPORTANT: Remember and reference previous messages in the conversation. If the citizen asks you to recall something they said, refer back to the conversation history.

Respond in character. Keep your response concise (2-4 sentences). Stay in character and be helpful while maintaining your personality.`,
  });

  // Convert history to Gemini's chat format
  const chatHistory = conversationHistory.map((msg) => ({
    role: msg.role === 'citizen' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));

  // Use the chat API for proper multi-turn conversation
  const chat = model.startChat({
    history: chatHistory as any,
  });

  const result = await chat.sendMessage(citizenMessage);
  const response = result.response;
  return response.text();
}

/**
 * Streaming version - yields tokens as they arrive
 */
export async function* generateCouncilResponseStream(
  personality: string,
  citizenName: string,
  citizenMessage: string,
  conversationHistory: Array<{ role: 'citizen' | 'council'; content: string }>
): AsyncGenerator<string, string, unknown> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: 'gemini-2.0-flash',
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ],
    systemInstruction: `${personality}

You are having a conversation with a citizen named "${citizenName}".

IMPORTANT: Remember and reference previous messages in the conversation. If the citizen asks you to recall something they said, refer back to the conversation history.

Respond in character. Keep your response concise (2-4 sentences). Stay in character and be helpful while maintaining your personality.`,
  });

  const chatHistory = conversationHistory.map((msg) => ({
    role: msg.role === 'citizen' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));

  const chat = model.startChat({
    history: chatHistory as any,
  });

  const result = await chat.sendMessageStream(citizenMessage);
  let fullText = '';

  for await (const chunk of result.stream) {
    const text = chunk.text();
    fullText += text;
    yield text;
  }

  return fullText;
}
