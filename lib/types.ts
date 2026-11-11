// Database types

// Identity profile for consistent character representation
export interface IdentityProfile {
  version: number;
  extractedAt: string;
  confirmedAt?: string;

  hair: {
    color: string;
    style: string;
    texture?: string;
    length?: string;
  };
  eyes: {
    color: string;
    shape?: string;
  };
  eyebrows?: {
    color?: string;
    shape?: string;
  };
  facialHair?: {
    type?: string;
    color?: string;
  };
  skinTone: string;
  faceShape?: string;
  distinctiveFeatures: string[];
  uncertainAttributes: string[];
}

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  tokens: number;
  tokens_used: number;
  created_at: string;
  updated_at: string;
}

// Token costs for different actions
export const TOKEN_COSTS = {
  CHARACTER_ILLUSTRATION: 1,
  BOOK_COVER: 1, // Single cover page
  BOOK_PAGE: 1,  // Each interior page
  BOOK_PREVIEW_PAGE: 1,
  BOOK_PREVIEW_FULL: 3, // 3 preview pages (for later)
} as const;

// Page generation status for full book generation
export interface PageStatus {
  pageId: string;         // "cover", "page-1", etc.
  pageNumber: number;
  status: "pending" | "generating" | "completed" | "failed";
  url?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  retryCount: number;
}

// Generation config stored in book for resume capability
export interface GenerationConfig {
  bookId: string;         // Blueprint book ID
  characterIds: string[];
  artStyle: string;
  totalPages: number;
  startedAt: string;
}

export const NEW_USER_TOKENS = 5;

export interface Character {
  id: string;
  user_id: string;
  name: string;
  original_photo_url: string;
  generated_image_url: string | null;
  generation_status: "pending" | "generating" | "completed" | "failed";
  character_type: "person" | "pet" | "other";
  pet_type: string | null;
  age_group: "child" | "adult" | "senior" | null;
  age?: number | null;
  physical_description: string | null; // AI-generated description from photo for story scenes
  identity_profile?: IdentityProfile | null;
  identity_confirmed?: boolean;
  identity_version?: number;
  created_at: string;
}

export interface Crew {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  crew_members?: CrewMemberWithCharacter[];
}

export interface CrewMember {
  id: string;
  crew_id: string;
  character_id: string;
  role: string | null;
}

export interface CrewMemberWithCharacter extends Omit<CrewMember, "character_id"> {
  character: Character;
}

export interface Story {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  description: string | null;
  cover_image_url: string | null;
  page_count: number;
  category: string | null;
  is_featured: boolean;
  created_at: string;
}

export interface ArtStyle {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  preview_image_url: string | null;
  prompt_modifier: string | null;
  ages: string | null;
}

// Character snapshot stored with book for resilient generation
export interface CharacterSnapshot {
  id: string;
  name: string;
  character_type?: string;
  pet_type?: string;
  age?: number | null;
  generated_image_url?: string;
  identity_profile?: IdentityProfile | null;
  identity_confirmed?: boolean;
}

export interface Book {
  id: string;
  user_id: string;
  crew_id: string | null;
  story_id: string | null;
  art_style_id: string | null;
  status: "draft" | "generating" | "preview_ready" | "cover_approved" | "generating_full" | "completed" | "purchased";
  preview_pages: { url: string; page_number: number; title?: string }[];
  page_statuses?: PageStatus[];
  generation_config?: GenerationConfig;
  characters_snapshot?: CharacterSnapshot[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Client-side character state (before saving to DB)
export interface LocalCharacter {
  id: string;
  name: string;
  photoUrl: string | null;
  photoFile: File | null;
  generatedUrl: string | null;
  status: "pending" | "uploading" | "generating" | "completed" | "failed";
  type: "person" | "pet";
  ageGroup: "child" | "adult" | "senior" | null;
  role: string | null;
}

// Available roles for characters
export const CHARACTER_ROLES = [
  "Hero",
  "Sidekick",
  "Guide",
  "Companion",
  "Pet",
  "Villain",
] as const;
