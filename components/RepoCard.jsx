'use client';

import { useState } from 'react';

export default function RepoCard({ repo }) {
  const [readme, setReadme] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const getScoreColor = (s) => {
    if (s >= 7) return 'bg-emerald-400/20 text-emerald-400 border-emerald-400/30';
    if (s >= 4) return 'bg-amber-400/20 text-amber-400 border-amber-400/30';
    return 'bg-red-400/20 text-red-400 border-red-400/30';
  };

  const handleGenerateReadme = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/generate-readme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoName: repo.name,
          description: repo.feedback,
          language: 'JavaScript',
        }),
      });
      const data = await res.json();
      setReadme(data.readme);
      setExpanded(true);
    } catch (err) {
      console.error('Failed to generate README:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-2xl p-5 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">{repo.name}</h3>
        <span className={`text-sm font-medium px-3 py-1 rounded-full border ${getScoreColor(repo.score)}`}>
          {repo.score}/10
        </span>
      </div>

      {/* Feedback */}
      <p className="text-sm text-gray-400 leading-relaxed mb-4">{repo.feedback}</p>

      {/* Missing items */}
      {repo.missing?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {repo.missing.map((item, i) => (
            <span
              key={i}
              className="text-xs px-2.5 py-1 rounded-full bg-red-400/10 text-red-400 border border-red-400/20"
            >
              {item}
            </span>
          ))}
        </div>
      )}

      {/* Generate README button */}
      <button
        onClick={handleGenerateReadme}
        disabled={loading}
        className="text-sm px-4 py-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Generating...' : '✦ Generate README'}
      </button>

      {/* Expandable README section */}
      {expanded && readme && (
        <div className="mt-4 p-4 bg-gray-950/60 border border-gray-700 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Generated README</span>
            <button
              onClick={() => { navigator.clipboard.writeText(readme); }}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Copy
            </button>
          </div>
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
            {readme}
          </pre>
        </div>
      )}
    </div>
  );
}
