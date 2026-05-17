'use client';

import { useState } from 'react';

export default function RepoCard({ repo }) {
  const [readme, setReadme] = useState(null);
  const [loadingReadme, setLoadingReadme] = useState(false);
  const [expandedReadme, setExpandedReadme] = useState(false);

  const [deepScan, setDeepScan] = useState(null);
  const [loadingDeepScan, setLoadingDeepScan] = useState(false);
  const [expandedDeepScan, setExpandedDeepScan] = useState(false);
  const [deepScanError, setDeepScanError] = useState('');

  const getScoreColor = (s) => {
    if (s >= 7) return 'bg-emerald-400/20 text-emerald-400 border-emerald-400/30';
    if (s >= 4) return 'bg-amber-400/20 text-amber-400 border-amber-400/30';
    return 'bg-red-400/20 text-red-400 border-red-400/30';
  };

  const handleGenerateReadme = async () => {
    setLoadingReadme(true);
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
      if (!res.ok) throw new Error(data.error);
      setReadme(data.readme);
      setExpandedReadme(true);
    } catch (err) {
      console.error('Failed to generate README:', err);
      alert(err.message || 'Failed to generate README');
    } finally {
      setLoadingReadme(false);
    }
  };

  const handleDeepScan = async () => {
    setLoadingDeepScan(true);
    setDeepScanError('');
    try {
      // Get the username from URL path context (assuming it's available or we can extract it)
      // Since this is rendered under /analyze/[username], we can pull it from window.location
      const pathParts = window.location.pathname.split('/');
      const username = pathParts[pathParts.length - 1]; // or pass as prop if refactored

      const res = await fetch('/api/deep-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          repoName: repo.name,
          repoMeta: repo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDeepScan(data.result);
      setExpandedDeepScan(true);
    } catch (err) {
      console.error('Deep scan failed:', err);
      setDeepScanError(err.message || 'Deep scan failed');
    } finally {
      setLoadingDeepScan(false);
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

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleGenerateReadme}
          disabled={loadingReadme}
          className="text-sm px-4 py-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingReadme ? 'Generating...' : '✦ Generate README'}
        </button>

        <button
          onClick={handleDeepScan}
          disabled={loadingDeepScan}
          className="text-sm px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingDeepScan ? 'Scanning...' : '🔍 Deep Scan'}
        </button>
      </div>
      
      {deepScanError && (
        <p className="mt-3 text-xs text-red-400">{deepScanError}</p>
      )}

      {/* Expandable Deep Scan section */}
      {expandedDeepScan && deepScan && (
        <div className="mt-4 p-5 bg-gray-950/60 border border-emerald-500/30 rounded-xl space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Deep Code Analysis</span>
            <span className="text-xs font-bold text-white bg-emerald-500/20 px-2 py-1 rounded">Score: {deepScan.codeQualityScore}/10</span>
          </div>
          
          <div>
            <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-1">Architecture</h4>
            <p className="text-sm text-gray-300">{deepScan.architecture}</p>
          </div>

          <div>
            <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-1">Feedback</h4>
            <p className="text-sm text-gray-300">{deepScan.feedback}</p>
          </div>

          {(deepScan.improvements?.length > 0 || deepScan.securityOrPerformance?.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              {deepScan.improvements?.length > 0 && (
                <div>
                  <h4 className="text-xs text-emerald-400/80 uppercase tracking-wide mb-1">Improvements</h4>
                  <ul className="list-disc pl-4 text-xs text-gray-400 space-y-1">
                    {deepScan.improvements.map((item, idx) => <li key={idx}>{item}</li>)}
                  </ul>
                </div>
              )}
              {deepScan.securityOrPerformance?.length > 0 && (
                <div>
                  <h4 className="text-xs text-amber-400/80 uppercase tracking-wide mb-1">Security / Perf</h4>
                  <ul className="list-disc pl-4 text-xs text-gray-400 space-y-1">
                    {deepScan.securityOrPerformance.map((item, idx) => <li key={idx}>{item}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Expandable README section */}
      {expandedReadme && readme && (
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
