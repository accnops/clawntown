import type { ConversationTurn } from '@clawntown/shared';
import { getCouncilMember } from '../council/index.js';
import { broadcaster } from '../realtime/index.js';
import { getActiveTurn, getMessages, addMessage, updateTurnTokens, endTurn, startTurn } from './turn.js';
import { removeFromQueue, getNextInQueue } from './queue.js';
import { queryTownData } from '../db/town-data.js';

// Placeholder for LLM integration
async function* streamLLMResponse(
  _systemPrompt: string,
  _messages: { role: string; content: string }[]
): AsyncGenerator<{ token: string; done: boolean }> {
  // TODO: Replace with actual LLM proxy call
  const mockResponse = "Ah, greetings citizen! Welcome to Clawntown. I'm Mayor Clawrence, and I'm absolutely claw-some to meet you! How may I help our wonderful coastal community today?";

  for (const char of mockResponse) {
    yield { token: char, done: false };
    await new Promise(resolve => setTimeout(resolve, 20)); // Simulate streaming
  }
  yield { token: '', done: true };
}

export async function handleCitizenMessage(
  memberId: string,
  citizenId: string,
  citizenName: string,
  content: string
): Promise<void> {
  const member = getCouncilMember(memberId);
  if (!member) throw new Error('Unknown council member');

  let turn = await getActiveTurn(memberId);

  // Verify this citizen has the active turn
  if (!turn || turn.citizenId !== citizenId) {
    throw new Error('Not your turn');
  }

  // Add citizen message
  await addMessage(turn.id, 'citizen', content, citizenId, citizenName);

  // Get conversation history
  const messages = await getMessages(turn.id);
  const llmMessages = messages.map(m => ({
    role: m.role === 'council' ? 'assistant' : 'user',
    content: m.content,
  }));

  // Stream response
  let fullResponse = '';
  let tokenCount = 0;

  for await (const { token, done } of streamLLMResponse(member.personality, llmMessages)) {
    if (done) break;

    fullResponse += token;
    tokenCount++;

    // Broadcast token to all viewers
    await broadcaster.broadcastConversationToken(memberId, turn.id, token);

    // Check budget
    if (turn.tokensUsed + tokenCount >= turn.tokenBudget) {
      break;
    }
  }

  // Save council response
  await addMessage(turn.id, 'council', fullResponse, null, null);
  await updateTurnTokens(turn.id, turn.tokensUsed + tokenCount);

  // Check if turn should end
  turn = (await getActiveTurn(memberId))!;
  if (turn.tokensUsed >= turn.tokenBudget) {
    await endTurn(turn.id, 'completed');
    await removeFromQueue(memberId, citizenId);
    await broadcaster.broadcastConversationEnd(memberId, turn.id, 'budget_exhausted');

    // Start next turn if someone is waiting
    await maybeStartNextTurn(memberId);
  }
}

export async function maybeStartNextTurn(memberId: string): Promise<ConversationTurn | null> {
  const activeTurn = await getActiveTurn(memberId);
  if (activeTurn) return null; // Already have active turn

  const next = await getNextInQueue(memberId);
  if (!next) return null; // Queue empty

  // Remove from queue when their turn starts
  await removeFromQueue(memberId, next.citizenId);
  const turn = await startTurn(memberId, next.citizenId);

  // Broadcast that it's their turn
  await broadcaster.broadcast('conversation', 'turn_start', {
    memberId,
    turnId: turn.id,
    citizenId: next.citizenId,
  });

  return turn;
}

export async function checkTimeoutsAndBudgets(): Promise<void> {
  // This runs on each tick to check for timed out turns
  const activeRecords = await queryTownData<ConversationTurn>('conversation_turn', { index_3: 'active' });

  const now = new Date();

  for (const record of activeRecords) {
    const turn = record.data;

    if (now >= new Date(turn.timeoutAt)) {
      await endTurn(turn.id, 'timed_out');
      await removeFromQueue(turn.memberId, turn.citizenId);
      await broadcaster.broadcastConversationEnd(turn.memberId, turn.id, 'timed_out');
      await maybeStartNextTurn(turn.memberId);
    }
  }
}
