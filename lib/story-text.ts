/**
 * Story Text Personalization
 * Handles replacing character name templates in story text with actual customer names
 * Also handles pronoun replacement based on character sex
 */

import type { NameMapping, V2Blueprint, V2Page } from "@/lib/book-blueprints";

/**
 * Sex mapping for pronoun generation
 * Maps slot IDs to sex (male/female) for correct pronouns
 */
export type SexMapping = Record<string, "male" | "female" | null>;

/**
 * Get pronoun forms for a given sex
 */
export function getPronouns(sex: "male" | "female" | null): {
  subject: string;    // he/she
  object: string;     // him/her
  possessive: string; // his/her
  reflexive: string;  // himself/herself
} {
  if (sex === "male") {
    return { subject: "he", object: "him", possessive: "his", reflexive: "himself" };
  } else if (sex === "female") {
    return { subject: "she", object: "her", possessive: "her", reflexive: "herself" };
  }
  // Default to "they" for unknown
  return { subject: "they", object: "them", possessive: "their", reflexive: "themselves" };
}

/**
 * Personalize story text by replacing template variables with customer names and pronouns
 * @param template - Story text template with {{slotId}} and {{slotId_pronoun}} placeholders
 * @param nameMapping - Map of slot IDs to customer display names
 * @param sexMapping - Optional map of slot IDs to sex for pronoun generation
 * @returns Personalized story text
 *
 * @example
 * personalizeStoryText(
 *   "{{leon}} ran to {{mum}} and gave {{mum_object}} a hug. {{leon_subject}} was happy.",
 *   { leon: "Tommy", mum: "Sarah" },
 *   { leon: "male", mum: "female" }
 * )
 * // Returns: "Tommy ran to Sarah and gave her a hug. He was happy."
 *
 * Supported pronoun placeholders:
 * - {{slotId_subject}} -> he/she/they
 * - {{slotId_object}} -> him/her/them
 * - {{slotId_possessive}} -> his/her/their
 * - {{slotId_reflexive}} -> himself/herself/themselves
 */
export function personalizeStoryText(
  template: string,
  nameMapping: NameMapping,
  sexMapping?: SexMapping
): string {
  let result = template;

  for (const [slotId, displayName] of Object.entries(nameMapping)) {
    // Replace all occurrences of {{slotId}} for names (case insensitive)
    const nameRegex = new RegExp(`\\{\\{${slotId}\\}\\}`, "gi");
    result = result.replace(nameRegex, displayName);

    // Replace pronoun placeholders if sex mapping is provided
    if (sexMapping && sexMapping[slotId]) {
      const pronouns = getPronouns(sexMapping[slotId]);

      // Subject pronoun (he/she)
      const subjectRegex = new RegExp(`\\{\\{${slotId}_subject\\}\\}`, "gi");
      result = result.replace(subjectRegex, pronouns.subject);

      // Also support {{slotId_he}} and {{slotId_she}} as aliases for subject
      const heRegex = new RegExp(`\\{\\{${slotId}_he\\}\\}`, "gi");
      result = result.replace(heRegex, pronouns.subject);
      const sheRegex = new RegExp(`\\{\\{${slotId}_she\\}\\}`, "gi");
      result = result.replace(sheRegex, pronouns.subject);

      // Object pronoun (him/her)
      const objectRegex = new RegExp(`\\{\\{${slotId}_object\\}\\}`, "gi");
      result = result.replace(objectRegex, pronouns.object);
      const himRegex = new RegExp(`\\{\\{${slotId}_him\\}\\}`, "gi");
      result = result.replace(himRegex, pronouns.object);
      const herRegex = new RegExp(`\\{\\{${slotId}_her\\}\\}`, "gi");
      result = result.replace(herRegex, pronouns.object);

      // Possessive pronoun (his/her)
      const possessiveRegex = new RegExp(`\\{\\{${slotId}_possessive\\}\\}`, "gi");
      result = result.replace(possessiveRegex, pronouns.possessive);
      const hisRegex = new RegExp(`\\{\\{${slotId}_his\\}\\}`, "gi");
      result = result.replace(hisRegex, pronouns.possessive);

      // Reflexive pronoun (himself/herself)
      const reflexiveRegex = new RegExp(`\\{\\{${slotId}_reflexive\\}\\}`, "gi");
      result = result.replace(reflexiveRegex, pronouns.reflexive);
    }
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
 * @param sexMapping - Optional map of slot IDs to sex for pronoun generation
 * @returns Array of personalized pages with story text
 */
export function personalizeAllPages(
  blueprint: V2Blueprint,
  nameMapping: NameMapping,
  sexMapping?: SexMapping
): PersonalizedPage[] {
  return blueprint.pages.map((page) => ({
    page_number: page.page_number,
    title: page.title,
    story_text: personalizeStoryText(page.story_text_template, nameMapping, sexMapping),
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
