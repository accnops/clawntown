export interface Project {
  id: string;
  title: string;
  description: string;
  scope: string;
  estimatedTokens: number;
  status: 'proposed' | 'voting' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'failed';
  proposedBy: string; // council member id
  conversationId: string; // source conversation
  supportVotes: number;
  opposeVotes: number;
  supportBribes: number; // in dummy currency
  opposeBribes: number;
  votingEndsAt: Date;
  createdAt: Date;
  completedAt: Date | null;
}

export interface ProjectVote {
  id: string;
  projectId: string;
  citizenId: string;
  vote: 'support' | 'oppose';
  bribeAmount: number;
  createdAt: Date;
}
