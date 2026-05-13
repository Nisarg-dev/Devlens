import { NextResponse } from 'next/server';
import { generateReadme } from '@/lib/gemini';

export async function POST(req) {
  const { repoName, description, language } = await req.json();
  const readme = await generateReadme(repoName, description ?? '', language ?? 'JavaScript');
  return NextResponse.json({ readme });
}
