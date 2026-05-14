import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { generateReadme } from '@/lib/gemini';

// Simple in-memory map to prevent extreme localized abuse if multiple users share the same session/IP
const recentReadmeGenerations = new Map();

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.email;
  const now = Date.now();
  const lastGeneration = recentReadmeGenerations.get(userId) || 0;
  
  // Require waiting 10 seconds between README generations to throttle AI spam
  if (now - lastGeneration < 10000) {
    return NextResponse.json({ error: 'Too many requests. Please wait before generating another README.' }, { status: 429 });
  }
  recentReadmeGenerations.set(userId, now);

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
