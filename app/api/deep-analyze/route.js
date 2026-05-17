import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { fetchRepoCodeFiles } from '@/lib/github';
import { deepAnalyzeRepo } from '@/lib/gemini';
import { checkAndIncrementLimit } from '@/lib/rateLimit';

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { username, repoName, repoMeta } = await req.json();

  // Input validation
  if (!username || typeof username !== 'string' || username.length > 39) {
    return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
  }
  if (!repoName || typeof repoName !== 'string' || repoName.length > 100) {
    return NextResponse.json({ error: 'Invalid repository name' }, { status: 400 });
  }

  // Rate limit check (3 deep scans per day)
  const limit = await checkAndIncrementLimit(session.user.email, 'deepScanCount');
  if (!limit.allowed) {
    return NextResponse.json({
      error: `Daily deep scan limit reached (${limit.limit}/day). Try again tomorrow.`,
      limits: limit,
    }, { status: 429 });
  }

  try {
    // 1. Fetch key code files from the repo (smart sampling — max 5 files, 80 lines each)
    const files = await fetchRepoCodeFiles(username, repoName);

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No analyzable code files found in this repository.' }, { status: 404 });
    }

    // 2. Send to AI for deep code review
    const result = await deepAnalyzeRepo(repoName, files, repoMeta || {});

    return NextResponse.json({
      result,
      filesAnalyzed: files.map(f => f.path),
      limits: limit,
    });
  } catch (err) {
    console.error('Deep analyze error:', err);
    return NextResponse.json({ error: err.message || 'Failed to deep analyze repository' }, { status: 500 });
  }
}
