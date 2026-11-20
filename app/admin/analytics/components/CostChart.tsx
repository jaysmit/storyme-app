"use client";

interface DailyData {
  date: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  totalCostUsd: number;
  avgCostPerRequest: number;
  uniqueUsers: number;
  uniqueBooks: number;
  avgDurationMs: number;
  regenerations: number;
}

interface CostChartProps {
  data: DailyData[];
  isLoading: boolean;
}

function formatCurrency(value: number): string {
  if (value >= 1) {
    return `$${value.toFixed(2)}`;
  } else if (value >= 0.01) {
    return `$${value.toFixed(3)}`;
  }
  return `$${value.toFixed(4)}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CostChart({ data, isLoading }: CostChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-brand-purple-muted bg-brand-purple/20 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 bg-brand-purple-muted rounded" />
          <div className="h-64 bg-brand-purple-muted rounded" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-brand-purple-muted bg-brand-purple/20 p-6">
        <h3 className="text-lg font-bold text-text-light mb-4">Daily Cost Trend</h3>
        <div className="h-64 flex items-center justify-center text-text-muted">
          No data available for the selected period
        </div>
      </div>
    );
  }

  // Find max values for scaling
  const maxCost = Math.max(...data.map((d) => d.totalCostUsd), 0.01);
  const maxRequests = Math.max(...data.map((d) => d.totalRequests), 1);

  // Calculate totals
  const totalCost = data.reduce((sum, d) => sum + d.totalCostUsd, 0);
  const totalRequests = data.reduce((sum, d) => sum + d.totalRequests, 0);

  return (
    <div className="rounded-xl border border-brand-purple-muted bg-brand-purple/20 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-text-light">Daily Cost Trend</h3>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-accent-gold" />
            <span className="text-text-muted">Cost</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-accent-teal" />
            <span className="text-text-muted">Requests</span>
          </div>
        </div>
      </div>

      {/* Summary row */}
      <div className="flex items-center gap-8 mb-4 text-sm">
        <div>
          <span className="text-text-muted">Period total: </span>
          <span className="font-bold text-accent-gold">{formatCurrency(totalCost)}</span>
        </div>
        <div>
          <span className="text-text-muted">Total requests: </span>
          <span className="font-bold text-accent-teal-light">{totalRequests.toLocaleString()}</span>
        </div>
      </div>

      {/* Chart area */}
      <div className="relative h-64">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-xs text-text-muted">
          <span>{formatCurrency(maxCost)}</span>
          <span>{formatCurrency(maxCost / 2)}</span>
          <span>$0</span>
        </div>

        {/* Chart bars */}
        <div className="absolute left-20 right-0 top-0 bottom-8 flex items-end gap-1">
          {data.map((day, index) => {
            const costHeight = (day.totalCostUsd / maxCost) * 100;
            const requestHeight = (day.totalRequests / maxRequests) * 100;

            return (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center gap-1 group relative"
              >
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-brand-dark border border-brand-purple-muted rounded-lg p-3 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                  <p className="font-bold text-text-light text-sm">{formatDate(day.date)}</p>
                  <div className="mt-2 space-y-1 text-xs">
                    <p><span className="text-accent-gold">Cost:</span> {formatCurrency(day.totalCostUsd)}</p>
                    <p><span className="text-accent-teal-light">Requests:</span> {day.totalRequests}</p>
                    <p><span className="text-green-400">Success:</span> {day.successRate}%</p>
                    <p><span className="text-text-muted">Users:</span> {day.uniqueUsers}</p>
                  </div>
                </div>

                {/* Bars container */}
                <div className="w-full h-full flex items-end justify-center gap-0.5">
                  {/* Cost bar */}
                  <div
                    className="w-2/5 bg-accent-gold/80 rounded-t transition-all hover:bg-accent-gold"
                    style={{ height: `${Math.max(costHeight, 2)}%` }}
                  />
                  {/* Requests bar (scaled differently) */}
                  <div
                    className="w-2/5 bg-accent-teal/80 rounded-t transition-all hover:bg-accent-teal"
                    style={{ height: `${Math.max(requestHeight, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className="absolute left-20 right-0 bottom-0 h-8 flex items-center">
          {data.map((day, index) => {
            // Show every Nth label based on data length
            const showLabel = data.length <= 7 || index % Math.ceil(data.length / 7) === 0;
            return (
              <div key={day.date} className="flex-1 text-center">
                {showLabel && (
                  <span className="text-xs text-text-muted">{formatDate(day.date)}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
