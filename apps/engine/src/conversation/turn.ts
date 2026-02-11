import type { ConversationTurn, ConversationMessage } from '@clawntown/shared';
import { queryTownData, insertTownData, updateTownData } from '../db/town-data.js';

const DEFAULT_TOKEN_BUDGET = 2000;
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export async function getActiveTurn(memberId: string): Promise<ConversationTurn | null> {
  const records = await queryTownData<ConversationTurn>('conversation_turn', {
    index_1: memberId,
    index_3: 'active'
  });
  return records[0]?.data ?? null;
}

export async function startTurn(
  memberId: string,
  citizenId: string,
  tokenBudget: number = DEFAULT_TOKEN_BUDGET
): Promise<ConversationTurn> {
  const now = new Date();
  const turn: ConversationTurn = {
    id: crypto.randomUUID(),
    memberId,
    citizenId,
    tokensUsed: 0,
    tokenBudget,
    startedAt: now,
    timeoutAt: new Date(now.getTime() + DEFAULT_TIMEOUT_MS),
    status: 'active',
  };

  await insertTownData('conversation_turn', turn, {
    index_1: memberId,
    index_2: citizenId,
    index_3: 'active',
  });

  return turn;
}

export async function addMessage(
  sessionId: string,
  role: 'citizen' | 'council',
  content: string,
  citizenId: string | null = null,
  citizenName: string | null = null
): Promise<ConversationMessage> {
  const message: ConversationMessage = {
    id: crypto.randomUUID(),
    sessionId,
    role,
    citizenId,
    citizenName,
    citizenAvatar: null,
    content,
    createdAt: new Date(),
  };

  await insertTownData('conversation_message', message, {
    index_1: sessionId,
    index_2: role,
  });

  return message;
}

export async function getMessages(sessionId: string): Promise<ConversationMessage[]> {
  const records = await queryTownData<ConversationMessage>('conversation_message', {
    index_1: sessionId,
  });

  return records
    .map(r => r.data)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function updateTurnTokens(turnId: string, tokensUsed: number): Promise<void> {
  const records = await queryTownData<ConversationTurn>('conversation_turn', {});
  const record = records.find(r => r.data.id === turnId);

  if (record) {
    await updateTownData(record.id, { ...record.data, tokensUsed });
  }
}

export async function endTurn(
  turnId: string,
  status: 'completed' | 'timed_out' | 'violation'
): Promise<void> {
  const records = await queryTownData<ConversationTurn>('conversation_turn', {});
  const record = records.find(r => r.data.id === turnId);

  if (record) {
    await updateTownData(record.id, { ...record.data, status }, { index_3: status });
  }
}

export async function checkTurnTimeout(turn: ConversationTurn): Promise<boolean> {
  const now = new Date();
  return now >= new Date(turn.timeoutAt);
}

export async function checkBudgetExhausted(turn: ConversationTurn): Promise<boolean> {
  return turn.tokensUsed >= turn.tokenBudget;
}
