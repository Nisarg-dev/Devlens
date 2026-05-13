'use client';

export default function SkillsSection({ visible, gap }) {
  return (
    <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 md:p-8">
      {/* Visible Skills */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3">Skills Detected</h3>
        <div className="flex flex-wrap gap-2">
          {visible?.map((skill, i) => (
            <span
              key={i}
              className="text-sm px-3 py-1.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Gap Skills */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Skills Gap</h3>
        <div className="flex flex-wrap gap-2">
          {gap?.map((skill, i) => (
            <span
              key={i}
              className="text-sm px-3 py-1.5 rounded-full bg-gray-800 text-gray-400 border border-dashed border-gray-600"
            >
              + {skill}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
