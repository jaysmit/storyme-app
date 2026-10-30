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

### Completed (Slices 0-4)
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

### Needs Setup
- [ ] Create Supabase project for Story-me
- [ ] Run database migrations
- [ ] Add real Supabase credentials to Vercel
- [ ] Add OpenAI API key to Vercel

### Remaining Work (Slices 5-6)
- [ ] Book preview generation with DALL-E
- [ ] Full book viewer component
- [ ] Page-by-page navigation

## API Routes

### Characters
- `GET /api/characters` - List user's characters
- `POST /api/characters` - Upload photo, create character
- `GET /api/characters/[id]` - Get single character
- `PATCH /api/characters/[id]` - Update character
- `DELETE /api/characters/[id]` - Delete character
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
- `app/create/page.tsx` - Creation wizard
- `app/crews/page.tsx` - Crews management
- `app/worlds/page.tsx` - Story worlds browse page
- `app/worlds/[slug]/page.tsx` - Story detail with role assignment
- `app/worlds/[slug]/StoryDetailContent.tsx` - Client component for story detail
- `app/(auth)/login/page.tsx` - Login form
- `app/(auth)/register/page.tsx` - Registration form
- `lib/supabase/client.ts` - Browser Supabase client
- `lib/supabase/server.ts` - Server Supabase client (includes service client)
- `lib/openai.ts` - DALL-E integration (lazy-loaded)
- `lib/types.ts` - TypeScript types
- `components/CharacterCard.tsx` - Character display component

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
