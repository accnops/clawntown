'use client';

import { useState, useEffect } from 'react';

interface Discussion {
  id: string;
  number: number;
  title: string;
  url: string;
  body: string;
  bodyHTML: string;
  createdAt: string;
  updatedAt: string;
  author: {
    login: string;
    avatarUrl: string;
  } | null;
  category: {
    name: string;
    emoji: string;
  };
  comments: {
    totalCount: number;
    nodes: Array<{
      id: string;
      body: string;
      bodyHTML: string;
      createdAt: string;
      author: {
        login: string;
        avatarUrl: string;
      } | null;
    }>;
  };
  answerChosenAt: string | null;
}

interface DiscussionsResponse {
  discussions: Discussion[];
  repoUrl: string;
  discussionsUrl: string;
  error?: string;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Convert GitHub emoji shortcodes to actual emojis
function convertEmoji(shortcode: string): string {
  const emojiMap: Record<string, string> = {
    ':speech_balloon:': '💬',
    ':mega:': '📣',
    ':bulb:': '💡',
    ':raised_hands:': '🙌',
    ':pray:': '🙏',
    ':question:': '❓',
    ':books:': '📚',
    ':hammer_and_wrench:': '🛠️',
    ':rocket:': '🚀',
    ':bug:': '🐛',
    ':sparkles:': '✨',
    ':zap:': '⚡',
    ':heart:': '❤️',
    ':star:': '⭐',
    ':wave:': '👋',
    ':lobster:': '🦞',
    ':crab:': '🦀',
    ':ocean:': '🌊',
    ':anchor:': '⚓',
    ':ship:': '🚢',
    ':lighthouse:': '🏠',
  };
  return emojiMap[shortcode] || shortcode.replace(/:/g, '');
}

function getCategoryStyle(categoryName: string): { bg: string; text: string; border: string } {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    'Announcements': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
    'Ideas': { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300' },
    'Q&A': { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
    'General': { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-300' },
    'Show and tell': { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' },
  };
  return styles[categoryName] || { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' };
}

export function GitHubDiscussions() {
  const [data, setData] = useState<DiscussionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null);

  useEffect(() => {
    async function fetchDiscussions() {
      try {
        const response = await fetch('/api/github/discussions');
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch discussions:', error);
        setData({
          discussions: [],
          repoUrl: 'https://github.com/accnops/clawntown',
          discussionsUrl: 'https://github.com/accnops/clawntown/discussions',
          error: 'Failed to load discussions',
        });
      } finally {
        setLoading(false);
      }
    }
    fetchDiscussions();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-3">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-lobster-red to-orange-500 animate-spin opacity-20"></div>
            <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
              <span className="text-3xl animate-bounce">🦞</span>
            </div>
          </div>
          <p className="font-retro text-sm text-gray-600">Loading discussions...</p>
        </div>
      </div>
    );
  }

  // Show discussion detail view
  if (selectedDiscussion) {
    const catStyle = getCategoryStyle(selectedDiscussion.category.name);
    return (
      <div className="flex flex-col h-full max-h-[60vh]">
        {/* Header */}
        <div className="mb-3 pb-3 border-b-2 border-dashed border-gray-300">
          <button
            onClick={() => setSelectedDiscussion(null)}
            className="font-retro text-xs text-lobster-red hover:underline mb-3 cursor-pointer flex items-center gap-1"
          >
            ← Back to discussions
          </button>
          <div className={`inline-block px-2 py-0.5 ${catStyle.bg} ${catStyle.text} border ${catStyle.border} mb-2`}>
            <span className="font-retro text-[10px] font-bold">{convertEmoji(selectedDiscussion.category.emoji)} {selectedDiscussion.category.name}</span>
          </div>
          <h2 className="font-retro text-base font-bold text-gray-800 leading-tight">
            {selectedDiscussion.title}
          </h2>
          <div className="flex items-center gap-3 mt-2">
            {selectedDiscussion.author && (
              <div className="flex items-center gap-1.5">
                <img
                  src={selectedDiscussion.author.avatarUrl}
                  alt={selectedDiscussion.author.login}
                  className="w-5 h-5 rounded-full border border-gray-300"
                />
                <span className="font-retro text-xs text-gray-600 font-medium">
                  @{selectedDiscussion.author.login}
                </span>
              </div>
            )}
            <span className="font-retro text-xs text-gray-400">
              {formatTimeAgo(selectedDiscussion.createdAt)}
            </span>
          </div>
        </div>

        {/* Discussion content */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-3">
          {/* Original post */}
          <div className="p-3 bg-sky-50 border-2 border-sky-200 rounded">
            <div
              className="font-retro text-xs text-gray-700 prose prose-sm max-w-none leading-relaxed
                [&_a]:text-blue-600 [&_a]:underline [&_a]:font-medium
                [&_code]:bg-white [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-pink-600 [&_code]:text-[11px]
                [&_pre]:bg-gray-800 [&_pre]:text-gray-100 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto
                [&_img]:max-w-full [&_img]:rounded-lg [&_img]:shadow-sm
                [&_ul]:list-disc [&_ul]:ml-4
                [&_ol]:list-decimal [&_ol]:ml-4
                [&_p]:mb-2"
              dangerouslySetInnerHTML={{ __html: selectedDiscussion.bodyHTML }}
            />
          </div>

          {/* Comments header */}
          {selectedDiscussion.comments.totalCount > 0 && (
            <div className="flex items-center gap-2 pt-2">
              <div className="h-px flex-1 bg-gray-200"></div>
              <span className="font-retro text-xs text-gray-500 flex items-center gap-1">
                💬 {selectedDiscussion.comments.totalCount} {selectedDiscussion.comments.totalCount === 1 ? 'reply' : 'replies'}
              </span>
              <div className="h-px flex-1 bg-gray-200"></div>
            </div>
          )}

          {/* Comments */}
          {selectedDiscussion.comments.nodes.map((comment) => (
            <div key={comment.id} className="p-3 bg-white border-2 border-gray-200 rounded hover:border-gray-300 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                {comment.author && (
                  <img
                    src={comment.author.avatarUrl}
                    alt={comment.author.login}
                    className="w-5 h-5 rounded-full border border-gray-200"
                  />
                )}
                <span className="font-retro text-xs font-bold text-gray-700">
                  @{comment.author?.login || 'unknown'}
                </span>
                <span className="font-retro text-[10px] text-gray-400">
                  {formatTimeAgo(comment.createdAt)}
                </span>
              </div>
              <div
                className="font-retro text-xs text-gray-700 prose prose-sm max-w-none
                  [&_a]:text-blue-600 [&_a]:underline
                  [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded
                  [&_pre]:bg-gray-800 [&_pre]:text-gray-100 [&_pre]:p-2 [&_pre]:rounded [&_pre]:overflow-x-auto
                  [&_img]:max-w-full [&_img]:rounded"
                dangerouslySetInnerHTML={{ __html: comment.bodyHTML }}
              />
            </div>
          ))}

          {selectedDiscussion.comments.totalCount > selectedDiscussion.comments.nodes.length && (
            <div className="text-center py-2">
              <span className="font-retro text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                +{selectedDiscussion.comments.totalCount - selectedDiscussion.comments.nodes.length} more on GitHub
              </span>
            </div>
          )}
        </div>

        {/* Join discussion CTA */}
        <div className="pt-3 border-t-2 border-dashed border-gray-300">
          <a
            href={selectedDiscussion.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-retro w-full text-xs"
          >
            💬 Join Discussion on GitHub
          </a>
        </div>
      </div>
    );
  }

  // Show discussions list
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4 p-3 bg-sky-600 text-white border-2 border-sky-700">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🦞</span>
          <div>
            <h3 className="font-retro text-sm font-bold">Clawntown Community</h3>
            <p className="font-retro text-[10px] opacity-90">Discussions on GitHub</p>
          </div>
        </div>
        <a
          href={data?.discussionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 w-full py-2 px-3 bg-white/20 hover:bg-white/30 rounded font-retro text-xs text-center transition-all flex items-center justify-center gap-2 border border-white/40"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          Start a New Discussion
        </a>
      </div>

      {/* Error message */}
      {data?.error && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded p-2 mb-3">
          <p className="font-retro text-[10px] text-amber-800 text-center">
            ⚠️ {data.error}
          </p>
        </div>
      )}

      {/* Discussions list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {data?.discussions.length === 0 ? (
          <div className="text-center py-6 bg-gray-100 border-2 border-gray-300 rounded p-4">
            <span className="text-3xl block mb-2">💬</span>
            <p className="font-retro text-xs text-gray-600 mb-1">
              No discussions yet
            </p>
            <p className="font-retro text-[10px] text-gray-500">
              Be the first to start a community discussion!
            </p>
          </div>
        ) : (
          data?.discussions.map((discussion) => {
            const catStyle = getCategoryStyle(discussion.category.name);
            return (
              <button
                key={discussion.id}
                onClick={() => setSelectedDiscussion(discussion)}
                className="w-full text-left bg-white border-2 border-gray-300 rounded p-3 hover:border-sky-400 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  {discussion.author && (
                    <img
                      src={discussion.author.avatarUrl}
                      alt={discussion.author.login}
                      className="w-8 h-8 rounded-full border-2 border-gray-200 group-hover:border-sky-300 transition-colors shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    {/* Category badge */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-block text-[9px] px-1.5 py-0.5 ${catStyle.bg} ${catStyle.text} border ${catStyle.border}`}>
                        {convertEmoji(discussion.category.emoji)} {discussion.category.name}
                      </span>
                    </div>
                    {/* Title */}
                    <h3 className="font-retro text-sm font-bold text-gray-800 group-hover:text-sky-700 transition-colors line-clamp-2 mb-1">
                      {discussion.title}
                    </h3>
                    {/* Meta */}
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="font-retro text-gray-500">
                        @{discussion.author?.login || 'unknown'}
                      </span>
                      <span className="font-retro text-gray-400 flex items-center gap-1">
                        <span>💬</span> {discussion.comments.totalCount}
                      </span>
                      <span className="font-retro text-gray-400">
                        {formatTimeAgo(discussion.updatedAt)}
                      </span>
                    </div>
                  </div>
                  {/* Arrow */}
                  <span className="text-gray-300 group-hover:text-sky-500 transition-colors text-lg">
                    →
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <a
          href={data?.discussionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-retro text-xs text-sky-600 hover:text-sky-800 flex items-center justify-center gap-1 py-1 transition-colors"
        >
          View all discussions on GitHub
          <span>→</span>
        </a>
      </div>
    </div>
  );
}
