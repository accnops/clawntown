export type ForumCategory = 'general' | 'project' | 'announcement';

export interface ForumThread {
  id: string;
  category: ForumCategory;
  projectId: string | null; // if project discussion
  title: string;
  authorId: string; // citizen or council member
  authorType: 'citizen' | 'council';
  isPinned: boolean;
  createdAt: Date;
  lastActivityAt: Date;
}

export interface ForumPost {
  id: string;
  threadId: string;
  authorId: string;
  authorType: 'citizen' | 'council';
  content: string;
  createdAt: Date;
}
