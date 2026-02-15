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
    model: 'gemini-2.5-flash',
    // Safety settings removed - we moderate inputs separately via moderate.ts
    systemInstruction: `${personality}

You are having a conversation with citizens in a public forum. Multiple citizens may speak - each citizen message is prefixed with their name in brackets like [CitizenName]. Pay attention to WHO is speaking and address them by name when appropriate.

CONVERSATION FLOW: Focus your reply on the latest message. The conversation history shows what has already been discussed and addressed - don't repeat or re-address those points. Respond naturally like you would in a group chat.

Respond in character. Keep your response concise (1-3 sentences). Stay in character and be helpful while maintaining your personality.

FORMATTING: When addressing citizens, use their name directly WITHOUT brackets. Write "Small Crab" not "[Small Crab]". Do NOT prefix your responses with your name or any label. Do NOT echo or repeat the citizen's message. Just respond directly with your own words.`,
  });

  // Convert history to Gemini's chat format, prefixing citizen messages with their name
  let chatHistory = conversationHistory.map((msg) => ({
    role: msg.role === 'citizen' ? 'user' : 'model',
    parts: [{
      text: msg.role === 'citizen' && msg.citizenName
        ? `[${msg.citizenName}]: ${msg.content}`
        : msg.content
    }],
  }));

  // Gemini requires first message to be from 'user', not 'model'
  // Drop leading 'model' messages if present
  while (chatHistory.length > 0 && chatHistory[0].role === 'model') {
    chatHistory = chatHistory.slice(1);
  }

  // Use the chat API for proper multi-turn conversation
  const chat = model.startChat({
    history: chatHistory as any,
  });

  const result = await chat.sendMessage(`[${citizenName}]: ${citizenMessage}`);
  let text = result.response.text();

  // Strip any echoed user message (Gemini sometimes repeats the input)
  // Matches: [Name]: message content\n at the start
  text = text.replace(/^\[[\w\s.]+\]:.*\n?/i, '');

  // Strip any [Name]: prefix without full echo
  text = text.replace(/^\[[\w\s.]+\]:\s*/i, '');

  // Strip brackets from names used mid-response (e.g., "[Small Crab]" -> "Small Crab")
  text = text.replace(/\[([\w\s.]+)\]/g, '$1');

  return text.trim();
}
