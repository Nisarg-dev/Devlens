'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ScoreCard from '@/components/ScoreCard';
import RepoCard from '@/components/RepoCard';
import SkillsSection from '@/components/SkillsSection';
import RoleReadiness from '@/components/RoleReadiness';
import ShareButton from '@/components/ShareButton';

export default function AnalyzeResultPage({ params }) {
  const router = useRouter();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analyses')
      .then(res => res.json())
      .then(data => {
        // Find the most recent analysis for this username
        const match = data.find(a => a.githubUsername.toLowerCase() === params.username.toLowerCase());
        if (match) {
          setAnalysis(match);
        } else {
          // If not found in user's history, they might be trying to access someone else's or an invalid one.
          // For now, redirect to dashboard or home.
          router.push('/dashboard');
        }
        setLoading(false);
      })
      .catch(() => {
        router.push('/dashboard');
      });
  }, [params.username, router]);

  if (loading) {
    return (
      <div className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full space-y-8 animate-pulse">
        <div className="h-10 bg-gray-800 rounded w-1/4 mb-10"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-8 lg:col-span-1">
            <div className="h-80 bg-gray-900 rounded-2xl"></div>
            <div className="h-64 bg-gray-900 rounded-2xl"></div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="h-40 bg-gray-900 rounded-2xl"></div>
            <div className="h-40 bg-gray-900 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const { result, shareId } = analysis;

  return (
    <div className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <h1 className="text-3xl font-bold text-white">
          Analysis for <span className="text-indigo-400">@{params.username}</span>
        </h1>
        <div className="flex gap-3">
          <button 
            onClick={() => router.push('/dashboard')}
            className="text-sm px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors"
          >
            Save to dashboard
          </button>
          <ShareButton shareId={shareId} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
    </div>
  );
}
