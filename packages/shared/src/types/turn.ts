export interface CitizenTurn {
  id: string;
  sessionId: string;
  memberId: string;
  citizenId: string;
  citizenName: string;
  charsUsed: number;
  charBudget: number;
  timeUsedMs: number;
  timeBudgetMs: number;
  messagesUsed: number;
  messageLimit: number;
  startedAt: number; // timestamp
  status: 'active' | 'completed' | 'expired';
}

export interface QueueEntry {
  id: string;
  citizenId: string;
  citizenName: string;
  citizenAvatar: string;
  joinedAt: number; // timestamp
}

export interface ConversationSession {
  id: string;
  memberId: string;
  startedAt: Date;
  endedAt: Date | null;
  status: 'active' | 'ended';
}

export interface ConversationMessage {
  id: string;
  sessionId: string;
  role: 'citizen' | 'council';
  citizenId: string | null;
  citizenName: string | null;
  content: string;
  createdAt: Date;
}
