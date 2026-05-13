'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import ShareButton from '@/components/ShareButton';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetch('/api/analyses')
        .then(res => res.json())
        .then(data => {
          setAnalyses(data);
          setLoading(false);
        });
    }
  }, [status, router]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex-1 p-8 max-w-5xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-white mb-8">Your past analyses</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-gray-900 border border-gray-800 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 max-w-5xl mx-auto w-full">
      <h1 className="text-3xl font-bold text-white mb-8">Your past analyses</h1>
      
      {analyses.length === 0 ? (
        <div className="text-center py-20 bg-gray-900/40 rounded-2xl border border-gray-800 border-dashed">
          <p className="text-gray-400 mb-6">No analyses yet. Go analyze your first profile.</p>
          <Link href="/" className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors">
            Analyze a profile
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {analyses.map(analysis => (
            <div key={analysis._id} className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{analysis.githubUsername}</h3>
                  <p className="text-sm text-gray-500">{formatDate(analysis.createdAt)}</p>
                </div>
                <div className={`px-3 py-1 rounded-full border text-sm font-bold
                  ${analysis.result.overallScore >= 7 ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' : 
                    analysis.result.overallScore >= 4 ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' : 
                    'bg-red-400/10 text-red-400 border-red-400/20'}`}>
                  {analysis.result.overallScore}/10
                </div>
              </div>
              
              <div className="mt-auto pt-6 flex gap-3">
                <Link 
                  href={`/analyze/${analysis.githubUsername}`}
                  className="flex-1 text-center text-sm px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors"
                >
                  View
                </Link>
                <ShareButton shareId={analysis.shareId} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
