'use client';

export default function RoleReadiness({ roleReadiness }) {
  const roles = [
    { label: 'Full-Stack', key: 'fullstack' },
    { label: 'Frontend', key: 'frontend' },
    { label: 'Backend', key: 'backend' },
  ];

  const getBarColor = (value) => {
    if (value >= 70) return 'bg-emerald-400';
    if (value >= 40) return 'bg-amber-400';
    return 'bg-red-400';
  };

  const getTextColor = (value) => {
    if (value >= 70) return 'text-emerald-400';
    if (value >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 md:p-8">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">Role Readiness</h3>
      <div className="space-y-5">
        {roles.map(({ label, key }) => {
          const value = roleReadiness?.[key] ?? 0;
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">{label}</span>
                <span className={`text-sm font-semibold ${getTextColor(value)}`}>{value}%</span>
              </div>
              <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${getBarColor(value)} transition-all duration-700 ease-out`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
