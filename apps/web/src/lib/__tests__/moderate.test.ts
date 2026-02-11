import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the gemini module
vi.mock('../gemini', () => ({
  getGeminiClient: vi.fn(),
}));

import { moderateWithLLM } from '../moderate';
import { getGeminiClient } from '../gemini';

const mockedGetGeminiClient = vi.mocked(getGeminiClient);

function createMockClient(responseText: string) {
  return {
    getGenerativeModel: () => ({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => responseText,
        },
      }),
    }),
  };
}

function createThrowingClient(error: Error) {
  return {
    getGenerativeModel: () => ({
      generateContent: vi.fn().mockRejectedValue(error),
    }),
  };
}

function createSlowClient() {
  return {
    getGenerativeModel: () => ({
      generateContent: vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000))
      ),
    }),
  };
}

describe('moderateWithLLM', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns safe for SAFE response', async () => {
    mockedGetGeminiClient.mockReturnValue(createMockClient('SAFE') as any);

    const result = await moderateWithLLM('Hello, I love Clawntown!');
    expect(result.safe).toBe(true);
  });

  it('returns unsafe for UNSAFE response', async () => {
    mockedGetGeminiClient.mockReturnValue(
      createMockClient('UNSAFE|harassment|This message contains threats') as any
    );

    const result = await moderateWithLLM('bad message');
    expect(result.safe).toBe(false);
    expect(result.category).toBe('harassment');
    expect(result.reason).toBe('This message contains threats');
  });

  it('returns unsafe for UNSAFE with missing parts', async () => {
    mockedGetGeminiClient.mockReturnValue(createMockClient('UNSAFE') as any);

    const result = await moderateWithLLM('bad message');
    expect(result.safe).toBe(false);
    expect(result.category).toBe('unknown');
  });

  it('fails open for unexpected response format', async () => {
    mockedGetGeminiClient.mockReturnValue(createMockClient('MAYBE') as any);

    const result = await moderateWithLLM('some message');
    expect(result.safe).toBe(true);
  });

  it('catches SDK safety exceptions as unsafe', async () => {
    const safetyError = new Error('[GoogleGenerativeAI Error]: SAFETY block triggered');
    mockedGetGeminiClient.mockReturnValue(createThrowingClient(safetyError) as any);

    const result = await moderateWithLLM('bad message');
    expect(result.safe).toBe(false);
    expect(result.category).toBe('safety_block');
  });

  it('fails open on non-safety errors', async () => {
    const networkError = new Error('Network timeout');
    mockedGetGeminiClient.mockReturnValue(createThrowingClient(networkError) as any);

    const result = await moderateWithLLM('some message');
    expect(result.safe).toBe(true);
  });

  it('fails open on timeout', async () => {
    mockedGetGeminiClient.mockReturnValue(createSlowClient() as any);

    const result = await moderateWithLLM('some message');
    // Should fail open due to timeout
    expect(result.safe).toBe(true);
  }, 10000);
});
