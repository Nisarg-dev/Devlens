'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ScoreCard from '@/components/ScoreCard';
import RepoCard from '@/components/RepoCard';
import SkillsSection from '@/components/SkillsSection';
import RoleReadiness from '@/components/RoleReadiness';

export default function SharePage({ params }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/share/${params.id}`)
      .then(res => {
        if (!res.ok) throw new Error('Analysis not found');
        return res.json();
      })
      .then(data => {
        setAnalysis(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full space-y-8 animate-pulse">
        <div className="h-10 bg-gray-800 rounded w-1/4 mb-10"></div>
        <div className="h-96 bg-gray-900 rounded-2xl"></div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Oops! {error || 'Analysis not found'}</h1>
        <p className="text-gray-400 mb-8">This shared link might be invalid or has been removed.</p>
        <Link href="/" className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors">
          Analyze your own GitHub
        </Link>
      </div>
    );
  }

  const { result, githubUsername } = analysis;

  return (
    <div className="flex-1 flex flex-col">
      {/* View Only Banner */}
      <div className="bg-indigo-600 text-white text-center py-2 text-sm font-medium shadow-md">
        This is a shared DevLens analysis for @{githubUsername}
      </div>

      <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white">
            Analysis for <span className="text-indigo-400">@{githubUsername}</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {/* Left Column */}
          <div className="space-y-8 lg:col-span-1">
            <ScoreCard 
              score={result.overallScore} 
              strengths={result.strengths} 
              weaknesses={result.weaknesses} 
            />
            <RoleReadiness roleReadiness={result.roleReadiness} />
            <SkillsSection visible={result.skillsVisible} gap={result.skillsGap} />
          </div>

          {/* Right Column (Repos) */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-white mb-4">Repository Feedback</h2>
            {result.repos?.map((repo, i) => (
              <RepoCard key={i} repo={repo} />
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="border-t border-gray-800 pt-12 pb-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-4">Curious about your own GitHub?</h3>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            Get an instant AI review of your public repositories, find skill gaps, and see if you&apos;re ready for interviews.
          </p>
          <Link href="/" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-black font-semibold hover:bg-gray-100 transition-all transform hover:scale-[1.02]">
            Analyze your own GitHub →
          </Link>
        </div>
      </div>
    </div>
  );
}
