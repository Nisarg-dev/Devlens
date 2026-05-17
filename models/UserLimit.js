import mongoose from 'mongoose';

const UserLimitSchema = new mongoose.Schema({
  userId:         { type: String, required: true },
  date:           { type: String, required: true }, // "2026-05-17" format (IST)
  analyzeCount:   { type: Number, default: 0 },
  deepScanCount:  { type: Number, default: 0 },
  readmeCount:    { type: Number, default: 0 },
  recruiterCount: { type: Number, default: 0 },
});

// One record per user per day — fast upsert lookups
UserLimitSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.models.UserLimit || mongoose.model('UserLimit', UserLimitSchema);
