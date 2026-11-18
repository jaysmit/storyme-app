/**
 * Book Completion Validation & Recovery
 *
 * Centralized validation logic to ensure books are only marked complete
 * when ALL required pages have been successfully generated and saved.
 *
 * NON-NEGOTIABLE PRINCIPLE:
 * A personalised book must never be considered complete until every required page,
 * including the cover, has been successfully generated, saved and validated against
 * the expected contents of its Master Book.
 */

import {
  loadBlueprintWithFormat,
  resolveBookId,
  type BookBlueprint,
  type V2Blueprint,
} from "@/lib/book-blueprints";
import type { PageStatus, GenerationConfig } from "@/lib/types";

// Extended page status with validation details
export type ExtendedPageStatus =
  | "pending"       // Waiting to be generated
  | "generating"    // Generation in progress
  | "validating"    // Image received, validating
  | "completed"     // Successfully generated and validated
  | "failed"        // Generation or save failed
  | "retrying"      // Retry in progress
  | "missing";      // Expected but not in page_statuses

// Page validation result
export interface PageValidationResult {
  pageId: string;
  pageNumber: number;
  status: ExtendedPageStatus;
  url?: string;
  error?: string;
  issues: string[];
  isValid: boolean;
}

// Book validation result
export interface BookValidationResult {
  isComplete: boolean;
  isValid: boolean;

  // Counts
  expectedPageCount: number;
  actualPageCount: number;
  completedCount: number;
  failedCount: number;
  pendingCount: number;
  generatingCount: number;
  missingCount: number;

  // Details
  pages: PageValidationResult[];
  missingPageIds: string[];
  failedPageIds: string[];
  recoverablePageIds: string[];  // Pages that can be retried

  // Issues found
  issues: string[];

  // Recommended status
  recommendedStatus: "completed" | "incomplete" | "generating_full";

  // Blueprint info
  blueprintId: string;
  blueprintFormat: "v1" | "v2";
}

// Expected book contents (stored at generation start)
export interface ExpectedBookContents {
  blueprintId: string;
  blueprintFormat: "v1" | "v2";
  blueprintVersion?: string;  // For future versioning
  expectedPageIds: string[];
  expectedPageCount: number;
  coverPageId: string;
  createdAt: string;
}

/**
 * Get expected page IDs from a blueprint
 */
export async function getExpectedPages(
  blueprintBookId: string
): Promise<{ pageIds: string[]; format: "v1" | "v2"; pageCount: number }> {
  const resolvedBookId = resolveBookId(blueprintBookId);
  const { blueprint: rawBlueprint, format } = await loadBlueprintWithFormat(resolvedBookId);

  if (format === "v2") {
    const blueprint = rawBlueprint as V2Blueprint;
    const pageIds = blueprint.pages
      .filter(p => p.master_image_filename)  // Only pages with images
      .map(p => `page-${p.page_number}`);
    return { pageIds, format, pageCount: pageIds.length };
  }

  // V1 format
  const blueprint = rawBlueprint as BookBlueprint;
  const pageIds = blueprint.pages
    .filter(p => p.originalImage)  // Only pages with images
    .map(p => p.pageId);
  return { pageIds, format, pageCount: pageIds.length };
}

/**
 * Build expected book contents for storage in generation_config
 */
export async function buildExpectedContents(
  blueprintBookId: string
): Promise<ExpectedBookContents> {
  const { pageIds, format, pageCount } = await getExpectedPages(blueprintBookId);

  // Find cover page (page-0 for V2, "cover" for V1)
  const coverPageId = format === "v2"
    ? pageIds.find(id => id === "page-0") || pageIds[0]
    : pageIds.find(id => id === "cover") || pageIds[0];

  return {
    blueprintId: resolveBookId(blueprintBookId),
    blueprintFormat: format,
    expectedPageIds: pageIds,
    expectedPageCount: pageCount,
    coverPageId,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Validate a single page
 */
function validatePage(
  expectedPageId: string,
  pageStatus: PageStatus | undefined,
  expectedPageNumber: number
): PageValidationResult {
  const issues: string[] = [];

  // Page not found in page_statuses
  if (!pageStatus) {
    return {
      pageId: expectedPageId,
      pageNumber: expectedPageNumber,
      status: "missing",
      issues: [`Page "${expectedPageId}" not found in page_statuses`],
      isValid: false,
    };
  }

  // Check status
  if (pageStatus.status !== "completed") {
    issues.push(`Page status is "${pageStatus.status}", expected "completed"`);
  }

  // Check URL exists
  if (!pageStatus.url) {
    issues.push("Page has no URL");
  } else if (pageStatus.url.includes("placeholder") || pageStatus.url.includes("demo")) {
    issues.push("Page URL appears to be a placeholder");
  }

  // Check for errors
  if (pageStatus.error) {
    issues.push(`Page has error: ${pageStatus.error}`);
  }

  return {
    pageId: expectedPageId,
    pageNumber: pageStatus.pageNumber,
    status: pageStatus.status as ExtendedPageStatus,
    url: pageStatus.url,
    error: pageStatus.error,
    issues,
    isValid: issues.length === 0 && pageStatus.status === "completed",
  };
}

/**
 * Validate a book's completion state against its blueprint
 *
 * This is the AUTHORITATIVE function for determining if a book is complete.
 * It must be used before setting book status to "completed".
 */
export async function validateBookCompletion(
  pageStatuses: PageStatus[],
  generationConfig: GenerationConfig | null,
  blueprintId?: string
): Promise<BookValidationResult> {
  const issues: string[] = [];
  const pages: PageValidationResult[] = [];
  const missingPageIds: string[] = [];
  const failedPageIds: string[] = [];
  const recoverablePageIds: string[] = [];

  // Get blueprint ID from config or parameter
  const bookId = blueprintId || generationConfig?.bookId;
  if (!bookId) {
    return {
      isComplete: false,
      isValid: false,
      expectedPageCount: 0,
      actualPageCount: pageStatuses.length,
      completedCount: 0,
      failedCount: 0,
      pendingCount: 0,
      generatingCount: 0,
      missingCount: 0,
      pages: [],
      missingPageIds: [],
      failedPageIds: [],
      recoverablePageIds: [],
      issues: ["No blueprint ID available for validation"],
      recommendedStatus: "incomplete",
      blueprintId: "",
      blueprintFormat: "v1",
    };
  }

  // Get expected pages from blueprint
  let expectedPages: { pageIds: string[]; format: "v1" | "v2"; pageCount: number };
  try {
    expectedPages = await getExpectedPages(bookId);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      isComplete: false,
      isValid: false,
      expectedPageCount: 0,
      actualPageCount: pageStatuses.length,
      completedCount: 0,
      failedCount: 0,
      pendingCount: 0,
      generatingCount: 0,
      missingCount: 0,
      pages: [],
      missingPageIds: [],
      failedPageIds: [],
      recoverablePageIds: [],
      issues: [`Failed to load blueprint: ${msg}`],
      recommendedStatus: "incomplete",
      blueprintId: bookId,
      blueprintFormat: "v1",
    };
  }

  // Create a map of page statuses for quick lookup
  const statusMap = new Map<string, PageStatus>();
  for (const status of pageStatuses) {
    statusMap.set(status.pageId, status);
  }

  // Check if page_statuses count matches expected
  if (pageStatuses.length !== expectedPages.pageCount) {
    issues.push(
      `Page count mismatch: ${pageStatuses.length} in page_statuses vs ${expectedPages.pageCount} expected from blueprint`
    );
  }

  // Validate each expected page
  let completedCount = 0;
  let failedCount = 0;
  let pendingCount = 0;
  let generatingCount = 0;
  let missingCount = 0;

  for (let i = 0; i < expectedPages.pageIds.length; i++) {
    const expectedPageId = expectedPages.pageIds[i];
    const pageStatus = statusMap.get(expectedPageId);
    const pageNumber = expectedPages.format === "v2"
      ? parseInt(expectedPageId.replace("page-", ""), 10)
      : i;

    const validation = validatePage(expectedPageId, pageStatus, pageNumber);
    pages.push(validation);

    // Count by status
    switch (validation.status) {
      case "completed":
        completedCount++;
        break;
      case "failed":
        failedCount++;
        failedPageIds.push(expectedPageId);
        recoverablePageIds.push(expectedPageId);
        break;
      case "pending":
        pendingCount++;
        recoverablePageIds.push(expectedPageId);
        break;
      case "generating":
        generatingCount++;
        break;
      case "missing":
        missingCount++;
        missingPageIds.push(expectedPageId);
        recoverablePageIds.push(expectedPageId);
        break;
    }

    // Add page issues to overall issues
    for (const issue of validation.issues) {
      issues.push(`Page ${pageNumber}: ${issue}`);
    }
  }

  // Check for extra pages in page_statuses that aren't in blueprint
  for (const [pageId] of statusMap) {
    if (!expectedPages.pageIds.includes(pageId)) {
      issues.push(`Unexpected page "${pageId}" in page_statuses (not in blueprint)`);
    }
  }

  // Determine recommended status
  let recommendedStatus: "completed" | "incomplete" | "generating_full";
  if (completedCount === expectedPages.pageCount && issues.length === 0) {
    recommendedStatus = "completed";
  } else if (generatingCount > 0 || pendingCount > 0) {
    recommendedStatus = "generating_full";
  } else {
    recommendedStatus = "incomplete";
  }

  const isComplete = completedCount === expectedPages.pageCount &&
                     failedCount === 0 &&
                     missingCount === 0 &&
                     pendingCount === 0;

  return {
    isComplete,
    isValid: issues.length === 0,
    expectedPageCount: expectedPages.pageCount,
    actualPageCount: pageStatuses.length,
    completedCount,
    failedCount,
    pendingCount,
    generatingCount,
    missingCount,
    pages,
    missingPageIds,
    failedPageIds,
    recoverablePageIds,
    issues,
    recommendedStatus,
    blueprintId: bookId,
    blueprintFormat: expectedPages.format,
  };
}

/**
 * Quick check if a book should be marked as complete
 * Returns true only if ALL pages are completed with valid URLs
 */
export async function shouldMarkComplete(
  pageStatuses: PageStatus[],
  generationConfig: GenerationConfig | null,
  blueprintId?: string
): Promise<boolean> {
  const validation = await validateBookCompletion(pageStatuses, generationConfig, blueprintId);
  return validation.isComplete && validation.recommendedStatus === "completed";
}

/**
 * Get pages that need recovery (failed, pending, or missing)
 */
export async function getRecoverablePages(
  pageStatuses: PageStatus[],
  generationConfig: GenerationConfig | null,
  blueprintId?: string
): Promise<{ pageId: string; pageNumber: number; reason: string }[]> {
  const validation = await validateBookCompletion(pageStatuses, generationConfig, blueprintId);

  return validation.pages
    .filter(p => !p.isValid)
    .map(p => ({
      pageId: p.pageId,
      pageNumber: p.pageNumber,
      reason: p.issues.join("; ") || `Status is ${p.status}`,
    }));
}

/**
 * Initialize page statuses for expected contents
 * Ensures all expected pages are tracked from the start
 */
export function initializePageStatusesFromExpected(
  expectedContents: ExpectedBookContents,
  coverUrl?: string
): PageStatus[] {
  return expectedContents.expectedPageIds.map((pageId, index) => {
    const isCover = pageId === expectedContents.coverPageId;
    const pageNumber = expectedContents.blueprintFormat === "v2"
      ? parseInt(pageId.replace("page-", ""), 10)
      : index;

    return {
      pageId,
      pageNumber,
      status: isCover && coverUrl ? "completed" : "pending",
      url: isCover ? coverUrl : undefined,
      retryCount: 0,
    };
  });
}

/**
 * Merge missing pages into existing page_statuses
 * Preserves successfully completed pages while adding missing ones
 */
export function mergePageStatuses(
  existingStatuses: PageStatus[],
  expectedContents: ExpectedBookContents
): PageStatus[] {
  const statusMap = new Map<string, PageStatus>();

  // Add existing statuses
  for (const status of existingStatuses) {
    statusMap.set(status.pageId, status);
  }

  // Add missing pages with pending status
  for (let i = 0; i < expectedContents.expectedPageIds.length; i++) {
    const pageId = expectedContents.expectedPageIds[i];
    if (!statusMap.has(pageId)) {
      const pageNumber = expectedContents.blueprintFormat === "v2"
        ? parseInt(pageId.replace("page-", ""), 10)
        : i;

      statusMap.set(pageId, {
        pageId,
        pageNumber,
        status: "pending",
        retryCount: 0,
      });
    }
  }

  // Convert back to array and sort by page number
  return Array.from(statusMap.values()).sort((a, b) => a.pageNumber - b.pageNumber);
}

/**
 * Log validation result for debugging
 */
export function logValidationResult(result: BookValidationResult): void {
  console.log("=== BOOK VALIDATION RESULT ===");
  console.log(`Blueprint: ${result.blueprintId} (${result.blueprintFormat})`);
  console.log(`Complete: ${result.isComplete}, Valid: ${result.isValid}`);
  console.log(`Pages: ${result.completedCount}/${result.expectedPageCount} completed`);
  console.log(`  - Completed: ${result.completedCount}`);
  console.log(`  - Failed: ${result.failedCount}`);
  console.log(`  - Pending: ${result.pendingCount}`);
  console.log(`  - Generating: ${result.generatingCount}`);
  console.log(`  - Missing: ${result.missingCount}`);
  console.log(`Recommended status: ${result.recommendedStatus}`);

  if (result.issues.length > 0) {
    console.log("Issues:");
    for (const issue of result.issues) {
      console.log(`  - ${issue}`);
    }
  }

  if (result.recoverablePageIds.length > 0) {
    console.log(`Recoverable pages: ${result.recoverablePageIds.join(", ")}`);
  }
}
