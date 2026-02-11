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
  memberId: string;
  citizenId: string;
  citizenName: string;
  citizenAvatar: string;
  joinedAt: Date;
  confirmedReady: boolean;
  confirmedAt: Date | null;
  readyCheckSentAt: Date | null;
  position: number;
  status: 'waiting' | 'ready_check' | 'confirmed' | 'active' | 'completed' | 'skipped';
}

export interface ViolationLog {
  id: string;
  citizenId: string;
  occurredAt: Date;
  violationType: 'profanity' | 'injection' | 'harassment' | 'hate_speech' | 'dangerous' | 'spam';
  messageContent: string;
  turnId: string;
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
