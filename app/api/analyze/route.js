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
  
  // 1. Strict Input Validation (GitHub username regex + length limits)
  if (!username || typeof username !== 'string' || username.length > 39 || !/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(username)) {
    return NextResponse.json({ error: 'Invalid GitHub username format' }, { status: 400 });
  }

  try {
    await connectDB();

    // 2. Anti-Spam / Rate Limiting (Check if user has analyzed anything in the last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentAnalysesCount = await Analysis.countDocuments({
      userId: session.user.email,
      createdAt: { $gte: fiveMinutesAgo }
    });

    if (recentAnalysesCount >= 3) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please wait a few minutes before analyzing again.' }, { status: 429 });
    }

    // 3. Fetch GitHub repos
    const repos = await fetchUserRepos(username);

    if (!repos || repos.length === 0) {
      return NextResponse.json({ error: 'No public repositories found for this user.' }, { status: 404 });
    }

    // 4. Call AI (Groq) for analysis
    const result = await analyzePortfolio(repos);

    // 5. Save to MongoDB
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
