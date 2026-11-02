"use client";

interface TokenConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  actionName: string;
  tokenCost: number;
  currentBalance: number;
  loading?: boolean;
}

export default function TokenConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  actionName,
  tokenCost,
  currentBalance,
  loading = false,
}: TokenConfirmModalProps) {
  if (!isOpen) return null;

  const hasEnough = currentBalance >= tokenCost;
  const remainingAfter = currentBalance - tokenCost;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-brand-purple rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl border border-brand-purple-muted">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Confirm Token Usage</h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-white transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <p className="text-text-muted">
            You&apos;re about to <span className="text-white font-semibold">{actionName}</span>
          </p>

          {/* Token breakdown */}
          <div className="bg-brand-purple-muted/50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-text-muted">Cost</span>
              <div className="flex items-center gap-1.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#F4C95D">
                  <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
                </svg>
                <span className="font-bold text-accent-gold">{tokenCost} token{tokenCost !== 1 ? 's' : ''}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-text-muted">Current balance</span>
              <div className="flex items-center gap-1.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill={hasEnough ? "#F4C95D" : "#EF4444"}>
                  <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
                </svg>
                <span className={`font-bold ${hasEnough ? 'text-accent-gold' : 'text-red-400'}`}>
                  {currentBalance} token{currentBalance !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="border-t border-brand-purple-muted pt-3 flex justify-between items-center">
              <span className="text-text-muted">After</span>
              <span className={`font-bold ${remainingAfter >= 0 ? 'text-white' : 'text-red-400'}`}>
                {remainingAfter >= 0 ? remainingAfter : 0} token{remainingAfter !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {!hasEnough && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" className="shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <p className="text-sm text-red-400">
                You don&apos;t have enough tokens. Purchase more to continue.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-full border border-brand-purple-muted text-white font-bold hover:bg-brand-purple-muted/50 transition-colors"
          >
            Cancel
          </button>

          {hasEnough ? (
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-3 rounded-full bg-accent-gold text-brand-purple font-bold hover:bg-accent-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
                  </svg>
                  Confirm
                </>
              )}
            </button>
          ) : (
            <a
              href="/pricing"
              className="flex-1 py-3 rounded-full bg-accent-gold text-brand-purple font-bold hover:bg-accent-gold/90 transition-colors text-center no-underline"
            >
              Buy Tokens
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
