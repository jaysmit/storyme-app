# StoryMe — Master Application Logic & Architecture

> **Single Source of Truth** for StoryMe's architecture, business logic, image generation rules, character replacement logic, book structure, and ongoing improvements.

---

## Table of Contents

1. [Claude's Instructions](#1-claudes-instructions)
2. [Types of Users](#2-types-of-users)
3. [Terminology](#3-terminology)
4. [How Character Replacement Works](#4-how-character-replacement-works)
5. [Blueprint JSON Structure](#5-blueprint-json-structure)
6. [Character System](#6-character-system)
7. [Page Structure](#7-page-structure)
8. [Image Generation Rules](#8-image-generation-rules)
9. [Story Text Personalization](#9-story-text-personalization)
10. [Book Completion Validation](#10-book-completion-validation)
11. [Known Issues & Solutions](#11-known-issues--solutions)
12. [Shared Modules](#12-shared-modules)
13. [Database Schema](#13-database-schema)
14. [API Contracts](#14-api-contracts)
15. [Version History](#15-version-history)

---

## 1. Claude's Instructions

Whenever working on the StoryMe application:

### Before Making Changes
- [ ] Read `STORYME_MASTER.md` if not already read during the current session
- [ ] Check for conflicting rules before implementing changes
- [ ] Consider how changes affect existing books AND future books

### During Development
- [ ] Ensure all new features comply with rules in this document
- [ ] Avoid hardcoding logic specific to an individual book
- [ ] Use shared modules instead of duplicating logic
- [ ] Maintain backwards compatibility wherever reasonably possible

### After Making Changes
- [ ] Update this document when introducing or modifying important application logic
- [ ] Record any AI image generation problems and solutions discovered
- [ ] Do not remove existing functionality unless specifically requested

### Code Location Principles
- **Shared logic** → `lib/` directory
- **Book-specific data** → `books/[bookId]/blueprint.json`
- **UI components** → `components/` directory
- **API routes** → `app/api/` directory

---

## 2. Types of Users

### Artists

Artists create original storybooks that become available for consumers to personalize.

**Artist Deliverables:**
- Master Book JSON (`blueprint.json`)
- Master Page images (cover.png, 1.png, 2.png, etc.)
- Visual style description
- Character slot definitions with per-page positioning

**What Artists Define:**
- Original story and illustrations
- Which character slots exist and their order (determines crew assignment)
- Per-page character positions, poses, and actions
- Visual style that all generations must match
- Story text templates with `{{placeholders}}`
- Which elements are protected (non-swappable)

### Consumers

Consumers select an existing story and personalize it using their own crew.

**Consumer Flow:**
1. Create characters (upload photo, generate caricature)
2. Select a Master Book
3. Add characters to crew (order determines slot assignment)
4. Preview cover
5. Generate full book
6. Edit text overlays
7. Order printed book

**What Consumers Provide:**
- Character names
- Reference photos
- Age (used for height calculation)
- Height (optional override)
- Identity profile (hair/eye/skin colors - extracted or edited)

---

## 3. Terminology

| Term | Definition |
|------|------------|
| **Master Book** | The original book created by an artist |
| **Master Page** | The original illustration with placeholder characters |
| **Blueprint** | The JSON file containing all Master Book data |
| **Character Slot** | A named position that accepts a Crew Member (e.g., "leon", "mum") |
| **Crew** | The ordered list of characters selected by a consumer |
| **Crew Member** | A consumer's personalized character |
| **Priority Rank** | Per-page importance - 1 = most important for that page |
| **Assignment Order** | Crew order determines slot assignment: Crew #1 → Slot #1 |
| **Caricature** | AI-generated illustrated version of a consumer's photo |
| **Identity Profile** | Locked appearance attributes (hair, eyes, skin) |
| **Personalized Book** | A consumer's generated version of a Master Book |

### Code Naming Conventions

```typescript
// Database/API (snake_case)
master_book_id, crew_member_id, page_number, story_text_template

// TypeScript interfaces (PascalCase)
V2Blueprint, V2Page, V2Assignment, CrewMember

// Variables/functions (camelCase)
assignCharactersToV2Slots, buildPromptFromV2Blueprint, getHeightDescription

// JSON keys in blueprints (snake_case)
page_number, story_text, master_image_filename, slot_id
```

---

## 4. How Character Replacement Works

This is the core concept of StoryMe. Understanding this is essential.

### The Separation Principle

**FROM THE BLUEPRINT (per-page):**
- Position in scene (`head_anchor` coordinates)
- Depth (`foreground`, `midground`, `background`)
- Action and pose (`"jumping and tapping ball"`)
- Clothing/wardrobe (`"Essendon guernsey"`)
- Priority rank for that page

**FROM THE CREW MEMBER (always):**
- Face and facial features
- Hair color, style, length
- Eye color and shape
- Skin tone
- **Height and body proportions** (based on age)
- Name (for story text)

### The Height Override Rule

**This is the most important rule for image generation.**

The Crew Member's height ALWAYS overrides the placeholder's height:
- If a 5-year-old replaces an adult slot → Draw a SHORT CHILD
- If an adult replaces a child slot → Draw a TALL ADULT

The placeholder character's size in the master image is irrelevant. Only the Crew Member's actual age and height matter.

### Assignment Algorithm

Crew Members are assigned to slots based on **order**, not matching:

```
Crew Member #1 → Slot #1 (first slot in blueprint.characters)
Crew Member #2 → Slot #2 (second slot in blueprint.characters)
Crew Member #3 → Slot #3
... and so on
```

**Slots without a Crew Member assigned are REMOVED from the scene.**

Exception: If an unmapped slot is the PRIMARY focus on a page, an available Crew Member may be used (rotating for even distribution).

### Example

Blueprint slots: `leon`, `eden`, `ruby`, `mum`, `dad`

Consumer selects 3 crew members in this order: Tommy, Sarah, Max

Result:
- `leon` → Tommy
- `eden` → Sarah
- `ruby` → Max
- `mum` → REMOVED from scene
- `dad` → REMOVED from scene

---

## 5. Blueprint JSON Structure

Every Master Book has a `blueprint.json` at: `books/[bookId]/blueprint.json`

### Minimal Required Structure

```json
{
  "schema_version": "1.0",
  "title": "Grand Final Day",
  "page_count": 12,
  "visual_style": "Premium cinematic 3D animated caricature...",

  "characters": {
    "leon": { "name": "Leon", "slot_id": "leon", "swappable": true },
    "eden": { "name": "Eden", "slot_id": "eden", "swappable": true }
  },

  "generation_rules": {
    "edit_instruction": "Replace only listed characters...",
    "text_instruction": "Do not render story text during image edit."
  },

  "pages": [
    { "page_number": 0, ... },
    { "page_number": 1, ... }
  ]
}
```

### Character Definition (Book-Level)

```json
{
  "characters": {
    "leon": {
      "name": "Leon",
      "slot_id": "leon",
      "swappable": true,

      "age": 5,
      "features": "youngest child; short brown hair; blue eyes",
      "features_note": "Original placeholder cues only; customer reference overrides appearance."
    }
  }
}
```

**Important:** The `age` and `features` fields are **documentation only**. They describe the original artwork for artist reference. During generation, the Crew Member's profile completely overrides these values. The `features_note` explicitly states this.

---

## 6. Character System

### What Matters (Used During Generation)

| Field | Source | Used For |
|-------|--------|----------|
| `slot_id` | Blueprint | Identifying which slot to replace |
| `name` | Blueprint | Fallback if no Crew Member assigned |
| `swappable` | Blueprint | Whether slot accepts Crew Members |

### What's Documentation Only (Not Used in Generation)

| Field | Purpose |
|-------|---------|
| `age` | Shows original design age (artist reference) |
| `features` | Describes original appearance (artist reference) |
| `features_note` | Explicitly states these are placeholder cues only |

### Crew Member Data (What Actually Gets Used)

```typescript
interface CrewMember {
  id: string;
  name: string;              // Replaces slot name in story text
  age: number;               // Determines height and proportions
  height_cm: number;         // Explicit height for prompts
  caricature_url: string;    // Reference image for appearance
  identity_profile: {
    hair: { color: string; style: string };
    eyes: { color: string };
    skinTone: string;
  };
  identity_confirmed: boolean;
}
```

### Height Calculation

If `height_cm` not provided, calculated from `age`:

| Age | Default Height |
|-----|----------------|
| 0-2 | 70-95cm |
| 3-5 | 95-115cm |
| 6-9 | 120-137cm |
| 10-13 | 142-163cm |
| 14-17 | 168-175cm |
| 18+ | 170cm |

---

## 7. Page Structure

### Per-Page Character Placement

This is where the REAL positioning data lives:

```json
{
  "page_number": 5,
  "title": "Eden Takes Flight",
  "master_image_filename": "5.png",
  "scene_description": "Opening ball-up at the MCG",
  "story_text": "The umpire threw the ball high...",
  "story_text_template": "{{eden}} leapt above her opponent...",

  "characters": [
    {
      "slot_id": "eden",
      "priority_rank": 1,
      "importance": "primary",
      "head_anchor": { "x": 0.4, "y": 0.29 },
      "depth": "foreground",
      "action_and_location": "jumping and tapping ball at center",
      "reference_image_index": 2
    },
    {
      "slot_id": "mum",
      "priority_rank": 2,
      "importance": "secondary",
      "head_anchor": { "x": 0.86, "y": 0.5 },
      "depth": "midground",
      "action_and_location": "running to receive tap",
      "reference_image_index": 3
    }
  ],

  "absent_character_ids": ["dad"],
  "protected_non_swappable_elements": ["opposing players", "umpire", "ball"]
}
```

### Key Fields

| Field | Description |
|-------|-------------|
| `priority_rank` | 1 = most important on this page (gets best identity fidelity) |
| `importance` | `primary` / `secondary` / `background` |
| `head_anchor` | Normalized coordinates (0-1) for character head position |
| `depth` | `foreground` / `midground` / `background` |
| `action_and_location` | What they're doing and where |
| `reference_image_index` | Which IMAGE index in API call (2, 3, 4...) |
| `absent_character_ids` | Characters NOT in this scene |
| `protected_non_swappable_elements` | Things to preserve unchanged |

### Cover Page (page_number: 0)

Cover pages should include:
- Book title prominently displayed
- Main characters
- Scene that represents the story

---

## 8. Image Generation Rules

### API Call Structure

```typescript
// Images sent to OpenAI images.edit:
const images = [
  masterPageImage,              // IMAGE 1 - the original page
  crewMember1Caricature,        // IMAGE 2 - priority rank 1
  crewMember2Caricature,        // IMAGE 3 - priority rank 2
  // ... in priority order
];
```

### Prompt Building Priority

1. **Height/Body Size** - Crew Member's actual proportions
2. **Face/Appearance** - From Crew Member's caricature
3. **Identity Profile** - Locked hair/eye/skin colors
4. **Position/Pose** - From blueprint's per-page placement
5. **Removals** - Unmapped slots removed from scene
6. **Composition** - Master page preserved

### Critical Prompt Instructions

The prompt builder (`buildPromptFromV2Blueprint`) includes:

```
⚠️ CRITICAL: The crew member's height MUST override the placeholder's height.
If a 5-year-old child replaces an adult slot, draw them as a SHORT CHILD.
If an adult replaces a child slot, draw them as a TALL ADULT.
```

### What Gets Replaced vs Preserved

**REPLACED (from Crew):**
- Face and facial features
- Hair color, style, texture
- Eye color and shape
- Skin tone
- Body height and proportions
- Name in story text

**PRESERVED (from Blueprint):**
- Position in scene (head_anchor)
- General pose direction
- Action and interaction with objects
- Clothing/wardrobe
- Background and scenery
- Protected elements
- Camera angle and composition

---

## 9. Story Text Personalization

### Template Variables

Story text uses `{{slot_id}}` placeholders:

```
"{{eden}} leapt above her opponent and tapped it straight towards {{mum}}."
```

### Personalization Rules

1. Replace `{{slot_id}}` with assigned Crew Member's name
2. If no Crew Member assigned, use original slot name
3. Preserve grammar and punctuation
4. `{{mum}}` / `{{dad}}` may remain as role labels if consumer doesn't rename

### Name Mapping

Stored in book's `name_mapping` JSONB:

```json
{
  "leon": "Tommy",
  "eden": "Sarah",
  "ruby": "Max",
  "mum": "Mum",
  "dad": "Dad"
}
```

---

## 10. Book Completion Validation

**NON-NEGOTIABLE PRINCIPLE:**
> A personalised book must never be considered complete until every required page, including the cover, has been successfully generated, saved and validated against the expected contents of its Master Book. Missing or failed pages must be recoverable independently without regenerating successfully completed pages.

### Book Statuses

| Status | Description |
|--------|-------------|
| `draft` | Initial state, no generation started |
| `generating` | Legacy status (cover generation) |
| `preview_ready` | Cover generated, ready for review |
| `cover_approved` | Cover approved, ready for full generation |
| `generating_full` | Full book generation in progress |
| `incomplete` | Generation finished but some pages failed/missing |
| `completed` | All pages successfully generated and validated |
| `purchased` | Book has been ordered for printing |

### Page Statuses

| Status | Description |
|--------|-------------|
| `pending` | Waiting to be generated |
| `generating` | Generation request in progress |
| `completed` | Successfully generated and saved |
| `failed` | Generation or save failed |
| `missing` | Expected but not in page_statuses |

### Validation Process

Before a book can be marked as `completed`:

1. **Load expected pages from blueprint** - Get the definitive list of required pages
2. **Compare against page_statuses** - Ensure all expected pages exist
3. **Check each page status** - All must be `completed`
4. **Verify URLs exist** - Each page must have a valid URL
5. **No placeholder images** - URLs must not be demo/placeholder
6. **Page count matches** - Number of completed pages equals expected

### Key Files

| File | Purpose |
|------|---------|
| `lib/book-validation.ts` | Centralized validation logic |
| `app/api/books/[id]/reconcile/route.ts` | Fix incorrectly completed books |

### Validation Functions

```typescript
// Check if a book should be marked complete
await shouldMarkComplete(pageStatuses, generationConfig, blueprintId)

// Get detailed validation result
const result = await validateBookCompletion(pageStatuses, generationConfig, blueprintId)
// Returns: { isComplete, completedCount, failedCount, missingPageIds, issues, ... }

// Get pages that need recovery
const pages = await getRecoverablePages(pageStatuses, generationConfig, blueprintId)
// Returns: [{ pageId, pageNumber, reason }]
```

### Expected Contents

When generation starts, expected contents are stored in `generation_config`:

```typescript
{
  bookId: "essendon-five",
  expectedPageIds: ["page-0", "page-1", "page-2", ...],
  expectedPageCount: 12,
  blueprintFormat: "v2",
  coverPageId: "page-0"
}
```

This ensures validation always knows what a complete book looks like.

### Recovery Flow

1. **Detect incomplete book** - Validation identifies missing/failed pages
2. **Merge missing pages** - Add missing page IDs to `page_statuses` with `pending` status
3. **Set status to `incomplete`** - Book shows in "Needs Recovery" section
4. **Consumer regenerates** - Only missing pages are regenerated
5. **Re-validate** - After all pages complete, book status becomes `completed`

### API Endpoints

```
GET /api/books/[id]/reconcile
  → Check book state without modifying

POST /api/books/[id]/reconcile
  ← { autoFix: true, prepareMissingForRetry: true }
  → Fix status and add missing pages for retry
```

---

## 11. Known Issues & Solutions

### Image Generation Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Adults shrunk to child size | AI ignoring height instructions | Emphatic height warnings: "CRITICAL: This is a 5-year-old CHILD. Draw them SHORT." |
| Characters missing | AI removing characters | Explicit count: "This scene contains exactly 3 people" |
| Wrong character replaced | Ambiguous identification | Use head_anchor coordinates + position descriptions |
| Child faces on adult bodies | AI not understanding replacement | Separate appearance (crew) from physique in prompts |
| Text appearing on images | AI generating text | Explicit: "Do NOT render any text" |
| Stuck "generating" status | Vercel/OpenAI timeout | Extended timeouts: vercel.json (300s), server (180s), client (240s) |

### Database Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Character order not preserved | Supabase `.in()` doesn't preserve order | Use `reorderCharacters()` after fetch |
| Stuck in "generating" | Timeout without cleanup | Allow retry of "generating" pages |

### UI Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Regenerated image not showing | Browser cache | Append `?t=${Date.now()}` to URLs |

---

## 12. Shared Modules

### Core Modules

| Module | Location | Purpose |
|--------|----------|---------|
| `book-blueprints.ts` | `lib/` | Load/parse blueprints, assignment algorithm, prompt building |
| `page-generation.ts` | `lib/` | Generate personalized page images with OpenAI |
| `story-text.ts` | `lib/` | Personalize story text with names |
| `generation-logs.ts` | `lib/` | Track generation analytics |
| `book-validation.ts` | `lib/` | Book completion validation and recovery |

### Key Functions

```typescript
// lib/book-blueprints.ts
loadBlueprintWithFormat(bookId): Promise<{blueprint, format}>
assignCharactersToV2Slots(characters, blueprint, page): {assignments, removals, nameMapping}
buildPromptFromV2Blueprint(blueprint, page, assignments, removals): string
getHeightDescription(age, height_cm): string
getDefaultHeightFromAge(age): number

// lib/page-generation.ts
generateV2Page(params): Promise<{url, tokens}>

// lib/story-text.ts
personalizeStoryText(template, nameMapping): string
```

---

## 13. Database Schema

### Core Tables

```sql
-- Books (consumer's personalized books)
books (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles,
  blueprint_id TEXT,              -- e.g., "essendon-five"
  blueprint_format TEXT,          -- "v1" or "v2"
  status TEXT,                    -- draft, preview_ready, cover_approved, generating_full, incomplete, completed
  cover_url TEXT,
  page_statuses JSONB,            -- [{pageId, pageNumber, status, url, error, retryCount}]
  generation_config JSONB,        -- {bookId, characterIds, expectedPageIds, expectedPageCount}
  characters_snapshot JSONB,      -- Frozen character data at generation time
  name_mapping JSONB,             -- {leon: "Tommy", mum: "Sarah"}
  personalized_pages JSONB,       -- Story text per page
  text_overlays JSONB,            -- Text position/style per page
  validation_result JSONB,        -- Last validation result with issues
  validated_at TIMESTAMPTZ,       -- When last validated
  created_at TIMESTAMPTZ
)

-- Characters (consumer's crew members)
characters (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles,
  name TEXT,
  type TEXT,                      -- person, pet_dog, pet_cat
  age INTEGER,
  height_cm INTEGER,
  photo_url TEXT,                 -- Original uploaded photo
  caricature_url TEXT,            -- AI-generated illustration
  identity_profile JSONB,         -- {hair: {color, style}, eyes: {color}, skinTone}
  identity_confirmed BOOLEAN,
  created_at TIMESTAMPTZ
)

-- Generation logs (analytics)
generation_logs (
  id UUID PRIMARY KEY,
  user_id UUID,
  book_id UUID,
  event_type TEXT,                -- cover_generate, page_generate, caricature_generate
  status TEXT,                    -- started, completed, failed
  page_number INTEGER,
  duration_ms INTEGER,
  tokens_used INTEGER,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
```

---

## 14. API Contracts

### Blueprint APIs

```
GET /api/blueprints
  → { books: [{bookId, title, format, pageCount, coverImage}] }

GET /api/blueprints/[bookId]/pages
  → { bookId, title, format, pageCount, pages: [{pageNumber, imageUrl, storyText}] }
```

### Book APIs

```
POST /api/books
  ← { blueprintId, characterIds: [...] }
  → Creates new personalized book

GET /api/books/[id]
  → Returns book with all data

POST /api/books/[id]/generate
  ← { characterIds: [...], regenerate?: boolean, editInstructions?: string }
  → Generate cover preview

POST /api/books/[id]/approve-cover
  → Approve cover, prepare for full generation

POST /api/books/[id]/start-full-generation
  → Start generating all pages (deducts tokens upfront)

POST /api/books/[id]/generate-page
  ← { pageNumber }
  → Generate single page

POST /api/books/[id]/retry-page
  ← { pageNumber }
  → Reset page status for retry

GET /api/books/[id]/reconcile
  → Check book state without modifying

POST /api/books/[id]/reconcile
  ← { autoFix?: boolean, prepareMissingForRetry?: boolean }
  → Validate book, fix status, add missing pages for retry

GET /api/books/[id]/status
  → Poll generation progress
```

### Character APIs

```
GET /api/characters
  → List user's characters

POST /api/characters
  ← { name, type, age, photo }
  → Create character

POST /api/characters/[id]/analyze
  → Analyze photo with GPT-4 Vision, extract identity

POST /api/characters/[id]/generate
  ← { identityProfile? }
  → Generate caricature with DALL-E
```

---

## 15. Version History

### Schema Versions

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-11 | V2 format with named slots, priority ranking, head anchors |
| 1.1 | 2024-11 | Book completion validation, `incomplete` status, reconciliation endpoint |

---

## Appendix A: Checklist for New Master Books

When creating a new Master Book:

- [ ] Create folder: `books/[bookId]/`
- [ ] Create `blueprint.json` with schema_version
- [ ] Add all master images (cover.png, 1.png, 2.png, etc.)
- [ ] Define character slots in `characters` object (order = assignment order)
- [ ] For each page, define character placements with:
  - [ ] `slot_id`, `priority_rank`, `importance`
  - [ ] `head_anchor` coordinates
  - [ ] `action_and_location` description
- [ ] Add `story_text_template` with {{placeholders}} for each page
- [ ] Define `absent_character_ids` for each page
- [ ] Define `protected_non_swappable_elements` for each page
- [ ] Test with various crew sizes (1, 3, 5 members)
- [ ] Add to stories API for discoverability

---

## Appendix B: Common Mistakes

1. **Using master character age for generation** - Don't. Crew Member's age/height overrides everything.

2. **Matching characters by age** - Don't. Assignment is purely order-based: Crew #1 → Slot #1.

3. **Preserving placeholder height** - Don't. Crew Member's height must override.

4. **Hardcoding book-specific logic** - Use blueprint data, not code conditionals.

5. **Forgetting character order matters** - The order in `characterIds` array determines slot assignment.

---

*Last updated: 2024-11-18*
*Document version: 2.0*
