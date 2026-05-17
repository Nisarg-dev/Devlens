import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { generateReadme } from '@/lib/gemini';
import { checkAndIncrementLimit } from '@/lib/rateLimit';

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.email;
  
  // Daily Rate Limiting
  const limit = await checkAndIncrementLimit(userId, 'readmeCount');
  if (!limit.allowed) {
    return NextResponse.json({ error: `Daily README generation limit reached (${limit.limit}/day). Try again tomorrow.` }, { status: 429 });
  }

  const { repoName, description, language } = await req.json();

  // Strict Input Validation (Prevent injection/overflows)
  if (!repoName || typeof repoName !== 'string' || repoName.length > 100) {
    return NextResponse.json({ error: 'Invalid repository name' }, { status: 400 });
  }
  
  // Truncate description if someone tries to inject a massive prompt to crash the model context length
  const safeDescription = (typeof description === 'string' ? description : '').substring(0, 1000);
  const safeLanguage = (typeof language === 'string' ? language : 'JavaScript').substring(0, 50);

  try {
    const readme = await generateReadme(repoName, safeDescription, safeLanguage);
    return NextResponse.json({ readme });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to generate README' }, { status: 500 });
  }
}
