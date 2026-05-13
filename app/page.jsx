'use client';

import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { data: session, status } = useSession();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze portfolio');
      }

      router.push(`/analyze/${username.trim()}`);
    } catch (err) {
      if (err.message.includes('not found')) {
        setError('User not found. Check the username and try again.');
      } else {
        setError(err.message);
      }
      setLoading(false);
    }
  };

  if (status === 'loading') return null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-3xl mx-auto w-full">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-sm font-medium mb-8">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
        </span>
        AI-Powered Code Review
      </div>

      <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-6 leading-tight">
        Is your GitHub ready <br className="hidden md:block" />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">for interviews?</span>
      </h1>
      
      <p className="text-lg text-gray-400 mb-12 max-w-xl mx-auto leading-relaxed">
        Get an instant AI review of your public repositories. We score your projects, find skill gaps, and tell you if you're ready for that next role.
      </p>

      {!session ? (
        <button
          onClick={() => signIn('github')}
          className="flex items-center gap-3 px-8 py-4 rounded-xl bg-white text-black font-semibold hover:bg-gray-100 transition-all transform hover:scale-[1.02] active:scale-95"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.113.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
          </svg>
          Sign in with GitHub to start
        </button>
      ) : (
        <form onSubmit={handleAnalyze} className="w-full max-w-md">
          <div className="relative flex items-center">
            <span className="absolute left-4 text-gray-500 font-medium">github.com/</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl py-4 pl-[105px] pr-32 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              required
            />
            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="absolute right-1.5 top-1.5 bottom-1.5 px-6 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing
                </>
              ) : (
                'Analyze'
              )}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
        </form>
      )}
    </div>
  );
}
