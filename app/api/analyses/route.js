import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { connectDB } from '@/lib/mongodb';
import Analysis from '@/models/Analysis';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  // .lean() strips Mongoose overhead — returns plain JSON objects, ~80% less RAM
  const analyses = await Analysis.find({ userId: session.user.email })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(analyses);
}
