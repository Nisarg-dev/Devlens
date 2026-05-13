'use client';

export default function ScoreCard({ score, strengths, weaknesses }) {
  // Color based on score: green ≥7, amber 4-6, red ≤3
  const getColor = (s) => {
    if (s >= 7) return { ring: 'border-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-400/10' };
    if (s >= 4) return { ring: 'border-amber-400', text: 'text-amber-400', bg: 'bg-amber-400/10' };
    return { ring: 'border-red-400', text: 'text-red-400', bg: 'bg-red-400/10' };
  };

  const color = getColor(score);

  return (
    <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 md:p-8">
      {/* Score Circle */}
      <div className="flex justify-center mb-8">
        <div className={`w-32 h-32 rounded-full border-4 ${color.ring} ${color.bg} flex items-center justify-center`}>
          <div className="text-center">
            <span className={`text-4xl font-bold ${color.text}`}>{score}</span>
            <span className="text-gray-400 text-lg">/10</span>
          </div>
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div>
          <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3">Strengths</h3>
          <ul className="space-y-2">
            {strengths?.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Weaknesses */}
        <div>
          <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3">Weaknesses</h3>
          <ul className="space-y-2">
            {weaknesses?.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-red-400 mt-0.5">✗</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
