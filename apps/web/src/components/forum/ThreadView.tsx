'use client';

import { useState } from 'react';

interface ForumPost {
  id: string;
  authorName: string;
  authorType: 'citizen' | 'council';
  content: string;
  createdAt: Date;
}

interface ThreadViewProps {
  title: string;
  category: 'general' | 'project' | 'announcement';
  posts: ForumPost[];
  onBack?: () => void;
  onReply?: (content: string) => void;
  canReply?: boolean;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ThreadView({
  title,
  category,
  posts,
  onBack,
  onReply,
  canReply = true,
}: ThreadViewProps) {
  const [replyContent, setReplyContent] = useState('');

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !onReply) return;
    onReply(replyContent.trim());
    setReplyContent('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-3 pb-2 border-b border-gray-400">
        {onBack && (
          <button
            onClick={onBack}
            className="font-retro text-[10px] text-blue-600 hover:underline mb-2 cursor-pointer"
          >
            ← Back to threads
          </button>
        )}
        <h2 className="font-retro text-sm font-bold text-gray-800">
          {title}
        </h2>
        <span className="font-retro text-[10px] text-gray-500">
          {category === 'announcement' && '📢 Announcement'}
          {category === 'project' && '🏗️ Project Discussion'}
          {category === 'general' && '💬 General'}
        </span>
      </div>

      {/* Posts */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
        {posts.map((post, index) => (
          <div
            key={post.id}
            className={`p-2 rounded ${
              index === 0 ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-retro text-[10px] font-bold text-gray-700">
                {post.authorName}
                {post.authorType === 'council' && ' 🦞'}
              </span>
              <span className="font-retro text-[10px] text-gray-400">
                {formatDate(post.createdAt)}
              </span>
            </div>
            <p className="font-retro text-xs text-gray-700 whitespace-pre-wrap">
              {post.content}
            </p>
          </div>
        ))}
      </div>

      {/* Reply form */}
      {canReply && onReply && (
        <form onSubmit={handleSubmitReply} className="border-t border-gray-400 pt-3">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write a reply..."
            className="input-retro w-full h-20 font-retro text-base resize-none mb-2"
          />
          <button
            type="submit"
            className="btn-retro w-full text-xs"
            disabled={!replyContent.trim()}
          >
            💬 Post Reply
          </button>
        </form>
      )}

      {!canReply && (
        <p className="font-retro text-[10px] text-gray-500 text-center border-t border-gray-400 pt-3">
          Sign in to reply to this thread
        </p>
      )}
    </div>
  );
}

export type { ForumPost };
