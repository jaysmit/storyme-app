# Story-me App Project Notes

## Overview
AI-powered children's storybook creator. Users upload photos of family members, which get transformed into storybook characters using DALL-E, then placed into customizable story templates with various art styles.

## Live URLs
- **Production**: https://storyme-app-roan.vercel.app
- **GitHub**: https://github.com/jaysmit/storyme-app

## Tech Stack
- **Framework**: Next.js 15 (App Router, TypeScript)
- **Styling**: Tailwind CSS v4 with custom theme
- **Database**: Supabase (Postgres + Auth) - NOT YET CONFIGURED
- **AI**: OpenAI DALL-E 3 for character generation
- **Hosting**: Vercel

## Current Status

### Completed (All Slices 0-6)
- [x] Next.js 15 project setup with TypeScript
- [x] Tailwind CSS with custom theme matching prototype design
- [x] Custom fonts (Fraunces, Kalam, Nunito Sans)
- [x] Color palette from prototype
- [x] Header and Footer components
- [x] Landing page with all 4 steps
- [x] Login/Register pages (UI only)
- [x] Create wizard with 4 steps:
  - Photo upload with drag-and-drop
  - Story selection grid
  - Art style picker with large preview
  - Preview with character avatars
- [x] Supabase client/server utilities
- [x] OpenAI integration utilities (lazy-loaded)
- [x] Database schema with RLS policies
- [x] Deployed to Vercel

**Slice 2: Characters**
- [x] Character API routes (CRUD)
- [x] Character generation API with DALL-E 3
- [x] CharacterCard component with status indicators
- [x] "Generate all previews" button
- [x] Photo upload to Supabase Storage (ready, needs credentials)
- [x] TypeScript types for all entities

**Slice 3: Crews**
- [x] Crew API routes (CRUD + members)
- [x] /crews page with list view
- [x] Create crew modal
- [x] "Save as crew" from create wizard
- [x] Member avatars display

**Slice 4: Stories & Styles**
- [x] Stories API routes (GET /api/stories, GET /api/stories/[slug])
- [x] Art styles API route (GET /api/art-styles)
- [x] /worlds page - Browse all 6 story templates
  - Category filters (fantasy, magical, sports, adventure, superhero, space)
  - Featured stories section
  - Colorful gradient cards with icons
- [x] /worlds/[slug] page - Story detail with role assignment
  - Hero section with category gradient
  - Story description and metadata
  - Role assignment UI (drag characters to roles)
  - Art style selector
  - Sidebar with selections summary
- [x] Static params generation for all story slugs
- [x] Service client for public data (no cookies)

**Slice 5: Book Creation**
- [x] Book API routes (CRUD + generate)
  - POST /api/books - Create book
  - GET /api/books - List user's books
  - GET /api/books/[id] - Get book
  - PATCH /api/books/[id] - Update book
  - DELETE /api/books/[id] - Delete book
  - POST /api/books/[id]/generate - Generate preview pages with DALL-E
- [x] Story scene templates for all 6 stories (5 scenes each)
- [x] DALL-E integration with art style prompts
- [x] BookViewer component with:
  - Page-by-page navigation
  - Keyboard controls (arrow keys, Escape)
  - Thumbnail strip navigation
  - Fullscreen mode
  - Generation progress indicator
- [x] Updated create wizard Step 4 to generate and view book
- [x] Demo mode with placeholder images when API not available

**Slice 6: Polish**
- [x] /books page - List user's books with status badges
- [x] /book/[id] page - View individual book
- [x] Placeholder image API for demo previews
- [x] "Order Printed Book" CTA on preview pages
- [x] Header navigation updated with "My Books" link
- [x] Error states and loading indicators throughout

### Recent Changes (2026-11-09)
- [x] **Character Identity Profile System** - Structured identity data for consistent character representation
  - New `identity_profile` JSONB column stores hair, eyes, skin tone, distinctive features
  - `identity_confirmed` boolean tracks user approval
  - GPT-4 Vision extracts attributes from uploaded photos
  - `POST /api/characters/[id]/analyze` - Extracts structured identity profile
  - `IdentityConfirmModal` component for reviewing/correcting attributes
  - Confirmed attributes are "locked" in caricature generation prompt
  - Identity profiles passed to book generation for consistent character appearance
  - Migration 008 adds identity columns to characters table
  - Flow: Upload photo -> Analyze identity -> Confirm/edit attributes -> Generate caricature
  - Backwards compatible: Characters without profiles use existing behavior

### Recent Changes (2026-11-05 PM)
- [x] **Expanded to 20 Story Books** - Now showing all available stories in UI
  - Added 4 missing blueprints: baby-brother, the-moon-borrowers, the-outback-star-train, the-quest-for-unicorn-valley
  - Updated `/api/stories` to read from blueprints instead of hardcoded demo list
  - All 20 stories now appear in Worlds page and Create wizard story selection
  - Each story has proper category, tagline, and cover image mapping
- [x] **Character Creation Fix** - Fixed 500 error when creating new crew members
  - Fixed `age_group` CHECK constraint violation (was using invalid values "toddler"/"teen")
  - Now correctly maps ages: 0-17 = child, 18-64 = adult, 65+ = senior
  - Added better error messages for debugging

### Recent Changes (2026-11-05)
- [x] **Book Blueprint System** - Complete architecture for personalized storybook generation
  - Created `book-blueprints/` directory with 20 individual book JSON files
  - Each blueprint contains: scene description, visual style, crew slots, book characters, protected elements
  - New `lib/book-blueprints.ts` with blueprint loader, validator, and prompt builder
  - Crew slots use semantic IDs (crew_grandmother, crew_girl, crew_boy, crew_dog, crew_baby)
  - Book characters are protected story elements (dragons, dinosaurs, fairies, etc.)
  - Blueprint-driven prompt generation for precise character replacement
  - Character-to-slot matching based on type (adult, child, dog, etc.)
  - Schema version 1.0 with validation
  - Ready for interior page blueprints (pages array in each JSON)
  - Migration script: `scripts/split-blueprints.js`

### Recent Changes (2026-11-04 PM)
- [x] **OpenAI Image Editing Pipeline Fix** - Critical overhaul of image generation
  - Master images now required - API returns clear error if missing instead of generating from scratch
  - Connected all 6 story cover images to templates (`/images/the-dragon-of-castle-valley.jpg`, etc.)
  - Added Sharp library for image processing and dimension detection
  - Dynamic output size based on input orientation (landscape: 1536x1024, portrait: 1024x1536, square: 1024x1024)
  - New `lib/image-processing.ts` with utilities:
    - `loadLocalImage()` - Load master images from public folder
    - `downloadImage()` - Download with metadata and dimension detection
    - `selectOutputSize()` - Choose best OpenAI output size
    - `classifyCharacters()` - Categorize guests, protected, unassigned
    - `compositeEditedImage()` - Post-processing (ready for mask support)
  - Better logging with image dimensions and classification
  - Error codes: `MASTER_IMAGE_REQUIRED`, `MASTER_IMAGE_NOT_FOUND`

### Recent Changes (2026-11-04)
- [x] **Book generation overhaul** - Complete story templates with character slots
  - Each page has metadata: sceneDescription, setting, mood, character slots (1-5)
  - Character slots define role, action, position, and whether required
  - Characters mapped to slots based on selection order
  - Strict requirement for character images (no text fallbacks)
- [x] **Precise art style definitions** - Detailed rendering specs for each style
  - `lib/image-composite.ts` with PRECISE_STYLE_DEFINITIONS
  - Includes rendering, lighting, colors, atmosphere, edges, texture, mood
  - `buildPagePrompt()` function for consistent prompt generation
- [x] **Story templates** - Full page definitions for all 6 stories
  - `lib/story-templates.ts` with PageDefinition and CharacterSlot interfaces
  - Cover page + 5 interior pages with character positions
  - Max 5 characters per crew/book enforced at API and UI levels
- [x] **Character Form Modal** - Popup when uploading photos
  - Confirmation dialog when closing without saving
  - "+X more" badge for queued photos
- [x] **Create wizard improvements**
  - Step 2 matches Worlds page design with category filters
  - Step 4 shows selected story cover image
  - Max 5 character selection enforced
- [x] Added metadata JSONB column to books table (migration 002)
- [x] Fixed book creation API to accept both `characterIds` and `characters` fields

### Changes (2026-11-02)
- [x] Integrated GPT-4 Vision for photo analysis before character illustration
- [x] Characters now show side-by-side original photo vs illustrated caricature
- [x] "Illustrate" button on character cards to trigger AI generation
- [x] "Regenerate" button to re-generate illustrations
- [x] Book generation uses character physical descriptions for consistent appearances
- [x] Added physical_description column to characters table (migration 006)
- [x] Removed crews page (simplified flow - select characters directly in create wizard)
- [x] Edit/delete buttons on character cards in both /characters and /create pages
- [x] Person/Pet/Other character type selection with pet type dropdown

### Needs Setup
- [ ] Run SQL migration: `ALTER TABLE characters ADD COLUMN IF NOT EXISTS pet_type TEXT;`
- [ ] Run SQL migration: `ALTER TABLE characters ADD COLUMN IF NOT EXISTS physical_description TEXT;`
- [ ] Run SQL migration: `ALTER TABLE characters ADD COLUMN IF NOT EXISTS age INTEGER;`
- [ ] Create "characters" storage bucket in Supabase (for generated illustrations)
- [ ] Create "previews" storage bucket in Supabase (for book pages)
- [ ] **Add OpenAI API key to Vercel**: `vercel env add OPENAI_API_KEY`

### Master Image Assets Needed
The following master illustrations exist in `/public/images/` and are now connected:
- [x] `the-dragon-of-castle-valley.jpg` → dragon-castle-valley
- [x] `the-fairy-glade.jpg` → fairy-glade
- [x] `grand-final-day.jpg` → grand-final-day
- [x] `captain-of-the-cloud-ship.jpg` → cloud-ship
- [x] `the-super-squad-and-the-sorceress.jpg` → super-squad
- [x] `the-great-galaxy-road-trip.jpg` → galaxy-road-trip

Interior pages still need master illustrations:
- [ ] Dragon of Castle Valley pages 1-5
- [ ] Fairy Glade pages 1-5
- [ ] Grand Final Day pages 1-5
- [ ] Cloud Ship pages 1-5
- [ ] Super Squad pages 1-5
- [ ] Galaxy Road Trip pages 1-5

Optional: Character editing masks (for precise region editing):
- [ ] Per-page PNG masks with white=editable, transparent=protected regions
- [ ] Store in `/public/masks/{story-slug}/page-{n}.png`

## API Routes

### Characters
- `GET /api/characters` - List user's characters
- `POST /api/characters` - Upload photo, create character
- `GET /api/characters/[id]` - Get single character
- `PATCH /api/characters/[id]` - Update character (including identity_profile)
- `DELETE /api/characters/[id]` - Delete character
- `POST /api/characters/[id]/analyze` - Extract identity profile from photo (GPT-4 Vision)
- `POST /api/characters/[id]/generate` - Generate AI image

### Crews
- `GET /api/crews` - List user's crews with members
- `POST /api/crews` - Create crew
- `GET /api/crews/[id]` - Get crew with members
- `PATCH /api/crews/[id]` - Update crew name
- `DELETE /api/crews/[id]` - Delete crew
- `POST /api/crews/[id]/members` - Add member
- `DELETE /api/crews/[id]/members?characterId=&crewId=` - Remove member

### Stories & Styles (Public)
- `GET /api/stories` - List all stories (public, with demo fallback)
- `GET /api/stories/[slug]` - Get story with roles (public, with demo fallback)
- `GET /api/art-styles` - List all art styles (public, with demo fallback)

### Books
- `POST /api/books` - Create new book
- `GET /api/books` - List user's books
- `GET /api/books/[id]` - Get single book
- `PATCH /api/books/[id]` - Update book
- `DELETE /api/books/[id]` - Delete book
- `POST /api/books/[id]/generate` - Generate preview pages with DALL-E

### Utilities
- `GET /api/placeholder/[width]/[height]` - Generate SVG placeholder images

## Database Schema

Tables defined in `supabase/migrations/001_initial_schema.sql`:
- `profiles` - User profiles (extends auth.users)
- `characters` - Uploaded photos and generated images
- `crews` - Saved character groups
- `crew_members` - Join table for crew membership
- `stories` - Story templates (6 seeded)
- `art_styles` - Art style options (7 seeded)
- `books` - User's created books

## Key Files
- `app/page.tsx` - Landing page
- `app/create/page.tsx` - Creation wizard with 4 steps (character selection + creation inline)
- `app/characters/page.tsx` - Character management with illustration generation
- `app/books/page.tsx` - User's books list
- `app/book/[id]/page.tsx` - Individual book viewer
- `app/worlds/page.tsx` - Story worlds browse page
- `app/worlds/[slug]/page.tsx` - Story detail with role assignment
- `app/(auth)/login/page.tsx` - Login form
- `app/(auth)/register/page.tsx` - Registration form
- `lib/supabase/client.ts` - Browser Supabase client
- `lib/supabase/server.ts` - Server Supabase client (includes service client)
- `lib/openai.ts` - DALL-E integration (lazy-loaded)
- `lib/types.ts` - TypeScript types
- `components/CharacterCard.tsx` - Character display component
- `components/BookViewer.tsx` - Page-flipping book viewer

## Design Tokens (globals.css)
```css
--color-brand-dark: #14163A
--color-brand-purple: #1E1B4B
--color-accent-gold: #F4C95D
--color-accent-rust: #B8431F
--color-cream: #FBF1DC
--font-display: Fraunces
--font-handwritten: Kalam
--font-body: Nunito Sans
```

## Environment Variables Needed
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

## Stories (Seeded)
1. The Dragon of Castle Valley (fantasy)
2. The Fairy Glade (magical)
3. Grand Final Day (sports)
4. Captain of the Cloud Ship (adventure)
5. The Super Squad and the Sorceress (superhero)
6. The Great Galaxy Road Trip (space)

## Art Styles (Seeded)
1. Enchanted glow
2. Watercolour dream
3. Pencil sketch
4. Paper-cut
5. 3D animated
6. Shadow silhouette
7. Toy bricks
