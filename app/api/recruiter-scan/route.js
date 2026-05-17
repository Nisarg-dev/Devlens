import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { fetchRecruiterMetadata } from '@/lib/github';
import { generateRecruiterReport } from '@/lib/gemini';
import { checkAndIncrementLimit } from '@/lib/rateLimit';

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { username, jobDescription } = await req.json();

  if (!username || typeof username !== 'string' || username.length > 39) {
    return NextResponse.json({ error: 'Invalid GitHub username' }, { status: 400 });
  }
  if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.length < 50) {
    return NextResponse.json({ error: 'Job description must be at least 50 characters' }, { status: 400 });
  }

  // Rate Limiting
  const limit = await checkAndIncrementLimit(session.user.email, 'recruiterCount');
  if (!limit.allowed) {
    return NextResponse.json({ error: `Daily recruiter scan limit reached (${limit.limit}/day). Try again tomorrow.` }, { status: 429 });
  }

  try {
    // 1. Fetch metadata & deterministic structural signals
    const githubData = await fetchRecruiterMetadata(username);

    // 2. Pass to AI for recruiter-friendly interpretation
    const report = await generateRecruiterReport(username, jobDescription, githubData);

    return NextResponse.json({
      report,
      limits: limit
    });
  } catch (err) {
    console.error('Recruiter scan error:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate recruiter report' }, { status: 500 });
  }
}
