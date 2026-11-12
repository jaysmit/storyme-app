/**
 * Story Text Personalization
 * Handles replacing character name templates in story text with actual customer names
 */

import type { NameMapping, V2Blueprint, V2Page } from "@/lib/book-blueprints";

/**
 * Personalize story text by replacing template variables with customer names
 * @param template - Story text template with {{slotId}} placeholders
 * @param nameMapping - Map of slot IDs to customer display names
 * @returns Personalized story text
 *
 * @example
 * personalizeStoryText(
 *   "{{leon}} ran to {{mum}} and gave her a hug.",
 *   { leon: "Tommy", mum: "Sarah" }
 * )
 * // Returns: "Tommy ran to Sarah and gave her a hug."
 */
export function personalizeStoryText(
  template: string,
  nameMapping: NameMapping
): string {
  let result = template;

  for (const [slotId, displayName] of Object.entries(nameMapping)) {
    // Replace all occurrences of {{slotId}} (case insensitive)
    const regex = new RegExp(`\\{\\{${slotId}\\}\\}`, "gi");
    result = result.replace(regex, displayName);
  }

  return result;
}

/**
 * Personalized page content for a V2 book
 */
export interface PersonalizedPage {
  page_number: number;
  title: string;
  story_text: string;
  word_count?: number;
}

/**
 * Generate all personalized story pages for a V2 book
 * @param blueprint - V2 blueprint with pages containing story_text_template
 * @param nameMapping - Map of slot IDs to customer display names
 * @returns Array of personalized pages with story text
 */
export function personalizeAllPages(
  blueprint: V2Blueprint,
  nameMapping: NameMapping
): PersonalizedPage[] {
  return blueprint.pages.map((page) => ({
    page_number: page.page_number,
    title: page.title,
    story_text: personalizeStoryText(page.story_text_template, nameMapping),
    word_count: page.word_count,
  }));
}

/**
 * Personalize a single page's story text
 */
export function personalizePageText(
  page: V2Page,
  nameMapping: NameMapping
): string {
  return personalizeStoryText(page.story_text_template, nameMapping);
}

/**
 * Extract unique slot IDs from a story text template
 * @param template - Story text template with {{slotId}} placeholders
 * @returns Array of unique slot IDs found in the template
 */
export function extractSlotIds(template: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const slotIds = new Set<string>();
  let match;

  while ((match = regex.exec(template)) !== null) {
    slotIds.add(match[1].toLowerCase());
  }

  return Array.from(slotIds);
}

/**
 * Extract all unique slot IDs from all pages in a blueprint
 */
export function extractAllSlotIds(blueprint: V2Blueprint): string[] {
  const allSlotIds = new Set<string>();

  for (const page of blueprint.pages) {
    const pageSlotIds = extractSlotIds(page.story_text_template);
    for (const id of pageSlotIds) {
      allSlotIds.add(id);
    }
  }

  return Array.from(allSlotIds);
}

/**
 * Validate that all required slot IDs have names in the mapping
 * @param blueprint - V2 blueprint
 * @param nameMapping - Current name mapping
 * @returns Object with missing slot IDs and whether mapping is complete
 */
export function validateNameMapping(
  blueprint: V2Blueprint,
  nameMapping: NameMapping
): { valid: boolean; missing: string[] } {
  const requiredSlotIds = extractAllSlotIds(blueprint);
  const missing = requiredSlotIds.filter((id) => !nameMapping[id]);

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Build a default name mapping from blueprint character definitions
 * Uses the original character names as defaults
 */
export function buildDefaultNameMapping(blueprint: V2Blueprint): NameMapping {
  const mapping: NameMapping = {};

  for (const [slotId, charDef] of Object.entries(blueprint.characters)) {
    mapping[slotId] = charDef.name;
  }

  return mapping;
}
