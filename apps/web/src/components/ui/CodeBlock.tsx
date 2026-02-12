'use client';

import { useState } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = 'bash' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs font-mono overflow-x-auto">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-2 py-1 text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Copy to clipboard"
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  );
}
