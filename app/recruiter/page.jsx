'use client';

import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';

export default function RecruiterPage() {
  const { data: session, status } = useSession();
  const [username, setUsername] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);

  if (status === 'loading') return null;

  if (!session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Recruiter Mode</h1>
        <p className="text-gray-400 mb-8 max-w-md">Sign in to use the AI-assisted technical screening tool for matching GitHub profiles to Job Descriptions.</p>
        <button
          onClick={() => signIn('github')}
          className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition-colors"
        >
          Sign in with GitHub
        </button>
      </div>
    );
  }

  const handleScan = async (e) => {
    e.preventDefault();
    if (!username.trim() || jobDescription.trim().length < 50) {
      setError('Please provide a valid GitHub username and at least a short job description.');
      return;
    }

    setLoading(true);
    setError('');
    setReport(null);

    try {
      setLoadingStep('Fetching repositories...');
      // Small artificial delay for UX pacing on fast responses
      await new Promise(r => setTimeout(r, 600)); 
      setLoadingStep('Extracting structural engineering signals...');

      const res = await fetch('/api/recruiter-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), jobDescription: jobDescription.trim() })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Scan failed');
      }

      setLoadingStep('Generating recruiter summary...');
      setReport(data.report);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <div className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-10">
      
      {/* LEFT COLUMN: Input Form */}
      <div>
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Technical Screening
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Recruiter Mode</h1>
          <p className="text-gray-400 text-sm">Match a candidate's GitHub profile against your job description to extract verified engineering signals.</p>
        </div>

        <form onSubmit={handleScan} className="space-y-6 bg-gray-900/60 p-6 rounded-2xl border border-gray-800">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">GitHub Username</label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-gray-500 text-sm">github.com/</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="torvalds"
                className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg py-3 pl-[90px] pr-4 focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Job Description</label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste requirements here (e.g. Needs React, Node.js, experience with Docker, CI/CD...)"
              className="w-full h-48 bg-gray-950 border border-gray-700 text-white rounded-lg p-4 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
              required
            ></textarea>
            <p className="text-xs text-gray-500 mt-2">Minimum 50 characters required.</p>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {loadingStep || 'Analyzing...'}
              </>
            ) : (
              'Generate Screening Report'
            )}
          </button>
        </form>
      </div>

      {/* RIGHT COLUMN: Results */}
      <div className="bg-gray-900/30 rounded-2xl border border-gray-800 p-6 flex flex-col">
        {!report && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 h-full min-h-[400px]">
            <svg className="w-12 h-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <p>Report will appear here.</p>
          </div>
        )}

        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 min-h-[400px]">
            <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
            <p className="text-emerald-400 font-medium animate-pulse">{loadingStep}</p>
          </div>
        )}

        {report && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Score Section */}
            <div className="flex flex-col md:flex-row gap-6 items-start justify-between bg-gray-900 rounded-xl p-5 border border-gray-800">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">{report.matchSummary}</h2>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Executive Summary</span>
              </div>
              <div className="flex flex-col items-center justify-center bg-gray-950 p-4 rounded-xl border border-gray-800 min-w-[120px]">
                <span className={`text-3xl font-bold ${report.matchScore >= 70 ? 'text-emerald-400' : report.matchScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                  {report.matchScore}%
                </span>
                <span className="text-xs text-gray-400">Match Score</span>
              </div>
            </div>

            {/* Verified & Maturity Signals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  Verified Signals
                </h3>
                <ul className="space-y-2">
                  {report.verifiedSignals.map((s, i) => (
                    <li key={i} className="text-sm text-gray-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  Maturity Signals
                </h3>
                <ul className="space-y-2">
                  {report.maturitySignals.map((s, i) => (
                    <li key={i} className="text-sm text-gray-300 bg-blue-500/10 border border-blue-500/20 px-3 py-2 rounded-lg">{s}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Standout Project */}
            <div>
              <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-2">Standout Project</h3>
              <p className="text-sm text-gray-300 leading-relaxed bg-gray-900 p-4 rounded-xl border border-gray-800">{report.standoutProject}</p>
            </div>

            {/* Risk & Interview Focus */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3">Missing / Risks</h3>
                <ul className="list-disc pl-4 space-y-1">
                  {report.riskMissingSignals.map((s, i) => (
                    <li key={i} className="text-sm text-gray-400">{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-3">Interview Focus</h3>
                <ul className="list-disc pl-4 space-y-1">
                  {report.interviewFocusAreas.map((s, i) => (
                    <li key={i} className="text-sm text-gray-400">{s}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Confidence Footer */}
            <div className="mt-8 pt-6 border-t border-gray-800">
              <p className="text-xs text-gray-500 italic flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                {report.confidenceNotes}
              </p>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
