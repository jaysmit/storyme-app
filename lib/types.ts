// Database types

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Character {
  id: string;
  user_id: string;
  name: string;
  original_photo_url: string;
  generated_image_url: string | null;
  generation_status: "pending" | "generating" | "completed" | "failed";
  character_type: "person" | "pet";
  age_group: "child" | "adult" | "senior" | null;
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

export interface Book {
  id: string;
  user_id: string;
  crew_id: string | null;
  story_id: string | null;
  art_style_id: string | null;
  status: "draft" | "generating" | "preview_ready" | "purchased";
  preview_pages: { url: string; page_number: number }[];
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
