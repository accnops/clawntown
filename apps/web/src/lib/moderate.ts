import { getGeminiClient } from './gemini';
import { HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export interface ModerationResult {
  safe: boolean;
  category?: string;
  reason?: string;
}

const MODERATION_PROMPT = `You are a content moderation classifier. Your job is to determine if the following user message is safe for a family-friendly chat application.

Respond with EXACTLY one of:
- SAFE
- UNSAFE|category|reason

Categories: harassment, hate_speech, sexual, dangerous, spam

The message to classify:
`;

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
];

export async function moderateWithLLM(message: string): Promise<ModerationResult> {
  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      safetySettings: SAFETY_SETTINGS,
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 100,
      },
    });

    const result = await Promise.race([
      model.generateContent(MODERATION_PROMPT + message),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Moderation timeout')), 5000)
      ),
    ]);

    const text = result.response.text().trim();

    if (text === 'SAFE') {
      return { safe: true };
    }

    if (text.startsWith('UNSAFE')) {
      const parts = text.split('|');
      return {
        safe: false,
        category: parts[1] || 'unknown',
        reason: parts[2] || 'Content flagged by moderation',
      };
    }

    // Unexpected response format — fail open
    return { safe: true };
  } catch (error: unknown) {
    // SDK safety exceptions fire before text generation
    if (error instanceof Error && error.message.includes('SAFETY')) {
      return {
        safe: false,
        category: 'safety_block',
        reason: 'Content blocked by safety filters',
      };
    }

    // Timeout or other errors — fail open (regex pass already caught the worst)
    console.warn('Moderation check failed, allowing message:', error);
    return { safe: true };
  }
}
