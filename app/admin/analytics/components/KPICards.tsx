"use client";

interface KPICardsProps {
  summary: {
    totalCostUsd: number;
    avgCostPerRequest: number;
    avgCostPerBook: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
    totalUsers: number;
    activeUsersLast7Days: number;
    totalBooks: number;
    completedBooks: number;
    totalRegenerations: number;
    regenerationRate: number;
  } | null;
  isLoading: boolean;
}

function formatCurrency(value: number): string {
  if (value >= 100) {
    return `$${value.toFixed(0)}`;
  } else if (value >= 1) {
    return `$${value.toFixed(2)}`;
  } else if (value >= 0.01) {
    return `$${value.toFixed(3)}`;
  } else {
    return `$${value.toFixed(4)}`;
  }
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  color: "gold" | "teal" | "rust" | "pink";
  icon: React.ReactNode;
}

function KPICard({ title, value, subtitle, color, icon }: KPICardProps) {
  const colorClasses = {
    gold: "text-accent-gold border-accent-gold/30 bg-accent-gold/5",
    teal: "text-accent-teal-light border-accent-teal/30 bg-accent-teal/5",
    rust: "text-accent-pink border-accent-pink/30 bg-accent-pink/5",
    pink: "text-accent-pink border-accent-pink/30 bg-accent-pink/5",
  };

  return (
    <div className={`rounded-xl border p-5 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-text-muted">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-text-muted mt-1">{subtitle}</p>
          )}
        </div>
        <div className="p-2 rounded-lg bg-brand-purple-muted/50">{icon}</div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-brand-purple-muted bg-brand-purple/20 p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-4 w-20 bg-brand-purple-muted rounded" />
          <div className="h-7 w-16 bg-brand-purple-muted rounded" />
          <div className="h-3 w-24 bg-brand-purple-muted rounded" />
        </div>
        <div className="w-10 h-10 bg-brand-purple-muted rounded-lg" />
      </div>
    </div>
  );
}

export default function KPICards({ summary, isLoading }: KPICardsProps) {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Cost Metrics */}
      <KPICard
        title="Total Cost"
        value={formatCurrency(summary.totalCostUsd)}
        subtitle={`${formatCurrency(summary.avgCostPerRequest)} avg/request`}
        color="gold"
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
      />

      <KPICard
        title="Total Requests"
        value={formatNumber(summary.totalRequests)}
        subtitle={`${summary.successRate.toFixed(1)}% success rate`}
        color="teal"
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        }
      />

      <KPICard
        title="Total Users"
        value={formatNumber(summary.totalUsers)}
        subtitle={`${summary.activeUsersLast7Days} active last 7 days`}
        color="rust"
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
            />
          </svg>
        }
      />

      <KPICard
        title="Total Books"
        value={formatNumber(summary.totalBooks)}
        subtitle={`${summary.completedBooks} completed`}
        color="pink"
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        }
      />

      {/* Secondary Metrics */}
      <KPICard
        title="Avg Cost/Book"
        value={formatCurrency(summary.avgCostPerBook)}
        color="gold"
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        }
      />

      <KPICard
        title="Successful"
        value={formatNumber(summary.successfulRequests)}
        subtitle={`${formatNumber(summary.failedRequests)} failed`}
        color="teal"
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
      />

      <KPICard
        title="Regenerations"
        value={formatNumber(summary.totalRegenerations)}
        subtitle={`${summary.regenerationRate.toFixed(1)}% of total`}
        color="rust"
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        }
      />

      <KPICard
        title="Failed Requests"
        value={formatNumber(summary.failedRequests)}
        subtitle={`${(100 - summary.successRate).toFixed(1)}% failure rate`}
        color="pink"
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
      />
    </div>
  );
}
