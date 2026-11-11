"use client";

interface GenerationProgressBarProps {
  completed: number;
  total: number;
  failed: number;
  generating: number;
}

export default function GenerationProgressBar({
  completed,
  total,
  failed,
  generating,
}: GenerationProgressBarProps) {
  if (total === 0) return null;

  const completedPercent = (completed / total) * 100;
  const failedPercent = (failed / total) * 100;
  const generatingPercent = (generating / total) * 100;

  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="h-3 bg-brand-purple-muted rounded-full overflow-hidden flex">
        {/* Completed section */}
        {completedPercent > 0 && (
          <div
            className="h-full bg-gradient-to-r from-accent-teal to-emerald-400 transition-all duration-500"
            style={{ width: `${completedPercent}%` }}
          />
        )}
        {/* Generating section */}
        {generatingPercent > 0 && (
          <div
            className="h-full bg-accent-gold animate-pulse transition-all duration-500"
            style={{ width: `${generatingPercent}%` }}
          />
        )}
        {/* Failed section */}
        {failedPercent > 0 && (
          <div
            className="h-full bg-red-500 transition-all duration-500"
            style={{ width: `${failedPercent}%` }}
          />
        )}
      </div>

      {/* Stats */}
      <div className="flex justify-between items-center mt-3 text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-accent-teal" />
            <span className="text-text-muted">
              <span className="text-white font-bold">{completed}</span> completed
            </span>
          </div>
          {failed > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-text-muted">
                <span className="text-red-400 font-bold">{failed}</span> failed
              </span>
            </div>
          )}
          {generating > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-accent-gold animate-pulse" />
              <span className="text-text-muted">
                <span className="text-accent-gold font-bold">{generating}</span> generating
              </span>
            </div>
          )}
        </div>
        <span className="text-accent-gold font-bold">
          {completed} of {total} pages
        </span>
      </div>
    </div>
  );
}
