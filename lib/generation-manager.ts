/**
 * Generation Manager
 *
 * Handles job claiming, duplicate prevention, and orchestration for book generation.
 * Uses database as the source of truth for generation state.
 *
 * Key principles:
 * 1. Only one worker can generate a page at a time (job claiming)
 * 2. Claims expire after a timeout to handle crashed workers
 * 3. The database is always the authoritative source of truth
 * 4. All operations are idempotent where possible
 */

import { type SupabaseClient } from "@supabase/supabase-js";
import { type PageStatus, GENERATION_CONFIG } from "@/lib/types";

// Generate a unique worker ID for this instance
// This helps identify which worker claimed a job
export function generateWorkerId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `worker-${timestamp}-${random}`;
}

// Generate a unique generation request ID using crypto (available in both Node and browser)
export function generateGenerationId(): string {
  const random = typeof crypto !== 'undefined'
    ? Array.from(crypto.getRandomValues(new Uint8Array(4)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    : Math.random().toString(36).substring(2, 10);
  return `gen-${random}-${Date.now().toString(36)}`;
}

/**
 * Check if a page's claim has expired
 */
export function isClaimExpired(pageStatus: PageStatus): boolean {
  if (!pageStatus.claimedAt) return true;

  const claimedAt = new Date(pageStatus.claimedAt).getTime();
  const now = Date.now();
  return now - claimedAt > GENERATION_CONFIG.CLAIM_TIMEOUT_MS;
}

/**
 * Check if a page is considered stalled (generating for too long)
 */
export function isPageStalled(pageStatus: PageStatus): boolean {
  if (pageStatus.status !== "generating") return false;
  if (!pageStatus.startedAt) return true; // No start time = stalled

  const startedAt = new Date(pageStatus.startedAt).getTime();
  const now = Date.now();
  return now - startedAt > GENERATION_CONFIG.STALLED_THRESHOLD_MS;
}

/**
 * Get pages that are eligible for generation
 * Returns pages that are pending, or stalled/expired generating
 */
export function getEligiblePages(pageStatuses: PageStatus[]): PageStatus[] {
  return pageStatuses.filter((page) => {
    // Skip completed pages
    if (page.status === "completed") return false;

    // Pending pages are always eligible
    if (page.status === "pending") return true;

    // Retrying pages are eligible
    if (page.status === "retrying") return true;

    // Failed pages need manual retry (don't auto-generate)
    if (page.status === "failed") return false;

    // Generating pages are eligible if stalled or claim expired
    if (page.status === "generating") {
      return isPageStalled(page) || isClaimExpired(page);
    }

    return false;
  });
}

/**
 * Get pages that are actively being generated (not stalled)
 */
export function getActivelyGeneratingPages(pageStatuses: PageStatus[]): PageStatus[] {
  return pageStatuses.filter((page) => {
    if (page.status !== "generating") return false;
    return !isPageStalled(page) && !isClaimExpired(page);
  });
}

/**
 * Attempt to claim a page for generation
 * Returns true if claim was successful, false if page is already claimed
 *
 * This uses an optimistic concurrency approach:
 * 1. Read current state
 * 2. Check if claimable
 * 3. Update with claim (atomic write)
 * 4. The update will fail if another worker claimed it first
 */
export async function claimPageForGeneration(
  supabase: SupabaseClient,
  bookId: string,
  pageId: string,
  workerId: string
): Promise<{
  success: boolean;
  pageStatus?: PageStatus;
  error?: string;
  generationId?: string;
}> {
  try {
    // Get current book state
    const { data: book, error: fetchError } = await supabase
      .from("books")
      .select("page_statuses, status")
      .eq("id", bookId)
      .single();

    if (fetchError || !book) {
      return { success: false, error: "Book not found" };
    }

    // Find the page
    const pageStatuses: PageStatus[] = book.page_statuses || [];
    const pageIndex = pageStatuses.findIndex((p) => p.pageId === pageId);

    if (pageIndex === -1) {
      return { success: false, error: `Page ${pageId} not found` };
    }

    const page = pageStatuses[pageIndex];

    // Check if page can be claimed
    if (page.status === "completed") {
      return { success: false, error: "Page already completed" };
    }

    if (page.status === "generating" && !isPageStalled(page) && !isClaimExpired(page)) {
      // Check if it's a different worker
      if (page.claimedBy && page.claimedBy !== workerId) {
        return { success: false, error: "Page claimed by another worker" };
      }
      // Same worker - allow re-claim (idempotent)
    }

    // Generate unique IDs for this attempt
    const generationId = generateGenerationId();
    const now = new Date().toISOString();

    // Update page status with claim
    const updatedPage: PageStatus = {
      ...page,
      status: "generating",
      claimedBy: workerId,
      claimedAt: now,
      startedAt: now,
      generationId,
      error: undefined,
    };

    pageStatuses[pageIndex] = updatedPage;

    // Atomic update - this will succeed or fail atomically
    const { error: updateError } = await supabase
      .from("books")
      .update({
        page_statuses: pageStatuses,
        updated_at: now,
      })
      .eq("id", bookId);

    if (updateError) {
      return { success: false, error: `Failed to claim: ${updateError.message}` };
    }

    console.log(`[CLAIM] Worker ${workerId} claimed page ${pageId} (gen: ${generationId})`);

    return {
      success: true,
      pageStatus: updatedPage,
      generationId,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: msg };
  }
}

/**
 * Release a claim on a page (on completion or failure)
 */
export async function releasePageClaim(
  supabase: SupabaseClient,
  bookId: string,
  pageId: string,
  result: {
    success: boolean;
    url?: string;
    error?: string;
    workerId: string;
    generationId: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current book state
    const { data: book, error: fetchError } = await supabase
      .from("books")
      .select("page_statuses")
      .eq("id", bookId)
      .single();

    if (fetchError || !book) {
      return { success: false, error: "Book not found" };
    }

    const pageStatuses: PageStatus[] = book.page_statuses || [];
    const pageIndex = pageStatuses.findIndex((p) => p.pageId === pageId);

    if (pageIndex === -1) {
      return { success: false, error: `Page ${pageId} not found` };
    }

    const page = pageStatuses[pageIndex];

    // Verify this worker owns the claim (or claim has expired)
    if (page.claimedBy && page.claimedBy !== result.workerId) {
      if (!isClaimExpired(page)) {
        console.warn(`[RELEASE] Worker ${result.workerId} tried to release page ${pageId} claimed by ${page.claimedBy}`);
        // Don't fail - the page might have been completed by the other worker
      }
    }

    const now = new Date().toISOString();

    // Update page status based on result
    const updatedPage: PageStatus = {
      ...page,
      status: result.success ? "completed" : "failed",
      url: result.success ? result.url : page.url,
      completedAt: result.success ? now : undefined,
      error: result.error,
      retryCount: result.success ? page.retryCount : (page.retryCount || 0) + 1,
      // Clear claim fields on completion
      claimedBy: undefined,
      claimedAt: undefined,
      generationId: undefined,
    };

    pageStatuses[pageIndex] = updatedPage;

    const { error: updateError } = await supabase
      .from("books")
      .update({
        page_statuses: pageStatuses,
        updated_at: now,
      })
      .eq("id", bookId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    console.log(`[RELEASE] Page ${pageId} ${result.success ? "completed" : "failed"}`);

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: msg };
  }
}

/**
 * Get the number of pages to trigger based on concurrency settings
 */
export function calculatePagesToTrigger(
  pageStatuses: PageStatus[],
  concurrencyLimit: number = GENERATION_CONFIG.DEFAULT_CONCURRENCY
): {
  pagesToTrigger: PageStatus[];
  activeCount: number;
  pendingCount: number;
  slotsAvailable: number;
} {
  const activePages = getActivelyGeneratingPages(pageStatuses);
  const eligiblePages = getEligiblePages(pageStatuses);

  const activeCount = activePages.length;
  const pendingCount = eligiblePages.length;
  const slotsAvailable = Math.max(0, concurrencyLimit - activeCount);
  const pagesToTrigger = eligiblePages.slice(0, slotsAvailable);

  return {
    pagesToTrigger,
    activeCount,
    pendingCount,
    slotsAvailable,
  };
}

/**
 * Check if a book has any incomplete generation work
 */
export function hasIncompleteGeneration(pageStatuses: PageStatus[]): boolean {
  return pageStatuses.some((p) =>
    p.status === "pending" ||
    p.status === "generating" ||
    p.status === "retrying"
  );
}

/**
 * Get a summary of generation status
 */
export function getGenerationSummary(pageStatuses: PageStatus[]): {
  total: number;
  completed: number;
  failed: number;
  generating: number;
  pending: number;
  retrying: number;
  stalled: number;
  percentComplete: number;
} {
  const total = pageStatuses.length;
  const completed = pageStatuses.filter((p) => p.status === "completed").length;
  const failed = pageStatuses.filter((p) => p.status === "failed").length;
  const generating = pageStatuses.filter((p) => p.status === "generating").length;
  const pending = pageStatuses.filter((p) => p.status === "pending").length;
  const retrying = pageStatuses.filter((p) => p.status === "retrying").length;
  const stalled = pageStatuses.filter((p) => isPageStalled(p)).length;
  const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    failed,
    generating,
    pending,
    retrying,
    stalled,
    percentComplete,
  };
}

/**
 * Log generation status for debugging
 */
export function logGenerationStatus(
  bookId: string,
  pageStatuses: PageStatus[],
  prefix: string = ""
): void {
  const summary = getGenerationSummary(pageStatuses);
  const shortId = bookId.substring(0, 8);

  console.log(
    `${prefix}[BOOK:${shortId}] ` +
    `${summary.completed}/${summary.total} complete (${summary.percentComplete}%) | ` +
    `generating: ${summary.generating} | pending: ${summary.pending} | ` +
    `failed: ${summary.failed} | stalled: ${summary.stalled}`
  );
}
