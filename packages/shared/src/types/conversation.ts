export interface ConversationQueue {
  memberId: string;
  queue: QueueEntry[];
}

export interface QueueEntry {
  id: string;
  citizenId: string;
  joinedAt: Date;
  status: 'waiting' | 'active' | 'completed';
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

export interface ConversationMessage {
  id: string;
  turnId: string;
  role: 'citizen' | 'council';
  content: string;
  createdAt: Date;
}

export interface ConversationTranscript {
  id: string;
  memberId: string;
  citizenId: string;
  messages: ConversationMessage[];
  createdAt: Date;
  endedAt: Date | null;
}
