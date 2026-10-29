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

### Completed (Slice 0-1)
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
  - Art style picker
  - Preview placeholder
- [x] Supabase client/server utilities
- [x] OpenAI integration utilities
- [x] Database schema with RLS policies
- [x] Deployed to Vercel

### Needs Setup
- [ ] Create Supabase project for Story-me
- [ ] Run database migrations
- [ ] Add real Supabase credentials to Vercel
- [ ] Add OpenAI API key to Vercel

### Remaining Work (Slices 2-6)
- [ ] Photo upload to Supabase Storage
- [ ] Character generation API with DALL-E
- [ ] Crew management (save/load crews)
- [ ] Book preview generation
- [ ] Full book viewer component

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
- `app/(auth)/login/page.tsx` - Login form
- `app/(auth)/register/page.tsx` - Registration form
- `lib/supabase/client.ts` - Browser Supabase client
- `lib/supabase/server.ts` - Server Supabase client
- `lib/openai.ts` - DALL-E integration

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
