'use client';

import { useState } from 'react';

export default function ShareButton({ shareId }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const url = `${window.location.origin}/share/${shareId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-sm px-4 py-2 rounded-lg bg-violet-500/20 text-violet-400 border border-violet-500/30 hover:bg-violet-500/30 transition-all duration-200"
    >
      {copied ? '✓ Copied!' : '🔗 Share'}
    </button>
  );
}
