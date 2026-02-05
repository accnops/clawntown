'use client';

interface ForumThread {
  id: string;
  title: string;
  category: 'general' | 'project' | 'announcement';
  authorName: string;
  authorType: 'citizen' | 'council';
  isPinned: boolean;
  replyCount: number;
  lastActivityAt: Date;
  createdAt: Date;
}

interface ThreadListProps {
  threads: ForumThread[];
  onThreadClick?: (threadId: string) => void;
  onNewThread?: () => void;
}

const CATEGORY_LABELS: Record<ForumThread['category'], string> = {
  general: '💬 General',
  project: '🏗️ Project',
  announcement: '📢 Announcement',
};

const CATEGORY_COLORS: Record<ForumThread['category'], string> = {
  general: 'bg-gray-100 text-gray-700',
  project: 'bg-blue-100 text-blue-700',
  announcement: 'bg-yellow-100 text-yellow-700',
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString();
}

export function ThreadList({ threads, onThreadClick, onNewThread }: ThreadListProps) {
  const sortedThreads = [...threads].sort((a, b) => {
    // Pinned first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    // Then by last activity
    return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
  });

  return (
    <div className="flex flex-col h-full">
      {/* New thread button */}
      {onNewThread && (
        <button
          onClick={onNewThread}
          className="btn-retro w-full mb-3 text-xs"
        >
          ✏️ New Thread
        </button>
      )}

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {sortedThreads.length === 0 ? (
          <div className="text-center py-8">
            <p className="font-retro text-xs text-gray-500">
              No threads yet
            </p>
            <p className="font-retro text-[10px] text-gray-400 mt-1">
              Be the first to start a discussion!
            </p>
          </div>
        ) : (
          sortedThreads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => onThreadClick?.(thread.id)}
              className="w-full text-left bg-white border border-gray-300 rounded p-2 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-2">
                {thread.isPinned && (
                  <span className="text-yellow-500 shrink-0">📌</span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${CATEGORY_COLORS[thread.category]}`}>
                      {thread.category === 'announcement' ? '📢' : thread.category === 'project' ? '🏗️' : '💬'}
                    </span>
                    <h3 className="font-retro text-xs font-bold text-gray-800 truncate flex-1">
                      {thread.title}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-retro text-gray-500">
                      by {thread.authorName}
                      {thread.authorType === 'council' && ' 🦞'}
                    </span>
                    <div className="flex items-center gap-2 text-gray-400">
                      <span>💬 {thread.replyCount}</span>
                      <span>{formatTimeAgo(thread.lastActivityAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export type { ForumThread };
