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
  conversationHistory: Array<{ role: 'citizen' | 'council'; content: string; citizenName?: string | null }>
): Promise<string> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    // Safety settings removed - we moderate inputs separately via moderate.ts
    systemInstruction: `${personality}

You are having a conversation with citizens in a public forum. Multiple citizens may speak - each citizen message is prefixed with their name in brackets like [CitizenName]. Pay attention to WHO is speaking and address them by name when appropriate.

Respond in character. Keep your response concise (1-3 sentences). Stay in character and be helpful while maintaining your personality.

IMPORTANT: Do NOT prefix your responses with your name or any label like "[Name]:". Just respond directly with your message.`,
  });

  // Convert history to Gemini's chat format, prefixing citizen messages with their name
  const chatHistory = conversationHistory.map((msg) => ({
    role: msg.role === 'citizen' ? 'user' : 'model',
    parts: [{
      text: msg.role === 'citizen' && msg.citizenName
        ? `[${msg.citizenName}]: ${msg.content}`
        : msg.content
    }],
  }));

  // Use the chat API for proper multi-turn conversation
  const chat = model.startChat({
    history: chatHistory as any,
  });

  const result = await chat.sendMessage(`[${citizenName}]: ${citizenMessage}`);
  let text = result.response.text();

  // Strip any [Name]: prefix the LLM might add (it sometimes mimics the citizen format)
  text = text.replace(/^\[[\w\s]+\]:\s*/i, '');

  return text;
}
