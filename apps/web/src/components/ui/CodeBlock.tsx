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
    <div className="relative">
      <pre className="bg-gray-900 text-gray-100 p-3 pr-16 rounded text-xs font-mono overflow-x-auto">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-2.5 py-1 text-xs bg-gray-600 hover:bg-gray-500 active:bg-gray-400 text-white rounded border border-gray-500 cursor-pointer transition-colors"
        aria-label="Copy to clipboard"
      >
        {copied ? '✓' : 'Copy'}
      </button>
    </div>
  );
}
