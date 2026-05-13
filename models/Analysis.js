import mongoose from 'mongoose';

const AnalysisSchema = new mongoose.Schema({
  userId:          { type: String, required: true },
  githubUsername:  { type: String, required: true },
  result:          { type: Object, required: true },
  isPublic:        { type: Boolean, default: false },
  shareId:         { type: String, unique: true, sparse: true },
  createdAt:       { type: Date, default: Date.now }
});

// Compound index: fast lookup of all analyses by user, newest first
AnalysisSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Analysis || mongoose.model('Analysis', AnalysisSchema);
