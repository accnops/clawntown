import type { QueueEntry, ConversationMessage } from './turn.js';

export interface ConversationQueue {
  memberId: string;
  queue: QueueEntry[];
}

export interface ConversationTurn {
  id: string;
  memberId: string;
  citizenId: string;
  tokensUsed: number;
  tokenBudget: number;
  startedAt: Date;
  timeoutAt: Date;
  status: 'active' | 'completed' | 'timed_out';
}

export interface ConversationTranscript {
  id: string;
  memberId: string;
  citizenId: string;
  messages: ConversationMessage[];
  createdAt: Date;
  endedAt: Date | null;
}
