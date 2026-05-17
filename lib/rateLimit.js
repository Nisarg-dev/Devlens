import { connectDB } from './mongodb';
import UserLimit from '@/models/UserLimit';

// ── Daily limits per user ──────────────────────────────────
export const DAILY_LIMITS = {
  analyzeCount:   5,   // profile analyses per day
  deepScanCount:  3,   // deep code scans per day
  readmeCount:    10,  // README generations per day
  recruiterCount: 10,  // Recruiter scans per day
};

/**
 * Get today's date string in IST (Asia/Kolkata).
 * Using a fixed timezone ensures the "day" resets consistently
 * regardless of where the Vercel function runs.
 */
function getTodayIST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // "2026-05-17"
}

/**
 * Check if the user is within their daily limit for the given type.
 * If allowed, atomically increments the counter and returns remaining uses.
 * If denied, returns allowed: false WITHOUT incrementing.
 *
 * @param {string} userId - user's email
 * @param {'analyzeCount'|'deepScanCount'|'readmeCount'} limitType
 * @returns {{ allowed: boolean, used: number, limit: number, remaining: number }}
 */
export async function checkAndIncrementLimit(userId, limitType) {
  await connectDB();
  const today = getTodayIST();
  const maxAllowed = DAILY_LIMITS[limitType];

  // First, check the current count without incrementing
  const current = await UserLimit.findOne({ userId, date: today }).lean();
  const currentCount = current?.[limitType] || 0;

  if (currentCount >= maxAllowed) {
    return {
      allowed: false,
      used: currentCount,
      limit: maxAllowed,
      remaining: 0,
    };
  }

  // Safe to increment — atomic update
  const record = await UserLimit.findOneAndUpdate(
    { userId, date: today },
    { $inc: { [limitType]: 1 } },
    { upsert: true, new: true }
  );

  return {
    allowed: true,
    used: record[limitType],
    limit: maxAllowed,
    remaining: maxAllowed - record[limitType],
  };
}

/**
 * Get all daily limit stats for a user (for the frontend to display).
 */
export async function getUserLimits(userId) {
  await connectDB();
  const today = getTodayIST();
  const record = await UserLimit.findOne({ userId, date: today }).lean();

  return {
    analyze:   { used: record?.analyzeCount   || 0, limit: DAILY_LIMITS.analyzeCount  },
    deepScan:  { used: record?.deepScanCount  || 0, limit: DAILY_LIMITS.deepScanCount },
    readme:    { used: record?.readmeCount    || 0, limit: DAILY_LIMITS.readmeCount   },
    recruiter: { used: record?.recruiterCount || 0, limit: DAILY_LIMITS.recruiterCount},
  };
}
