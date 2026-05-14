import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Analysis from '@/models/Analysis';

export async function GET(req, { params }) {
  await connectDB();
  const analysis = await Analysis.findOne(
    { shareId: params.id },
    { userId: 0 } // exclude the user's email
  ).lean();
  if (!analysis) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(analysis);
}
