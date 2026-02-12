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
      <pre className="p-3 pr-16 text-xs font-mono overflow-x-auto border-2" style={{ backgroundColor: '#073642', color: '#93a1a1', borderTopColor: '#002b36', borderLeftColor: '#002b36', borderBottomColor: '#586e75', borderRightColor: '#586e75' }}>
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-2 py-0.5 font-retro text-[10px] bg-retro-gray text-retro-dark cursor-pointer border-2 border-t-white border-l-white border-b-gray-500 border-r-gray-500 hover:bg-gray-300 active:border-t-gray-500 active:border-l-gray-500 active:border-b-white active:border-r-white"
        aria-label="Copy to clipboard"
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  );
}
