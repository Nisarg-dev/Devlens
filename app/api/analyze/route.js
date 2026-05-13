import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { fetchUserRepos } from '@/lib/github';
import { analyzePortfolio } from '@/lib/gemini';
import { connectDB } from '@/lib/mongodb';
import Analysis from '@/models/Analysis';
import { generateShareId } from '@/lib/utils';

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { username } = await req.json();
  if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 });

  try {
    // 1. Fetch GitHub repos
    const repos = await fetchUserRepos(username);

    // 2. Call AI (Groq) for analysis
    const result = await analyzePortfolio(repos);

    // 3. Save to MongoDB
    await connectDB();
    const analysis = await Analysis.create({
      userId: session.user.email,
      githubUsername: username,
      result,
      shareId: generateShareId(),
    });

    return NextResponse.json({ analysisId: analysis._id, result, shareId: analysis.shareId });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
