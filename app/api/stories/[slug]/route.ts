import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Demo stories for fallback
const demoStories: Record<string, {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  cover_image_url: string | null;
  page_count: number;
  category: string;
  is_featured: boolean;
  roles: { id: string; name: string; description: string }[];
}> = {
  "dragon-castle-valley": {
    id: "1",
    slug: "dragon-castle-valley",
    title: "The Dragon of Castle Valley",
    tagline: "A dragon guards the road to the glowing castle. Only a brave crew can win their way past.",
    description: "An epic fantasy adventure where your family must work together to outsmart a fearsome dragon and reach the enchanted castle.",
    cover_image_url: null,
    page_count: 24,
    category: "fantasy",
    is_featured: true,
    roles: [
      { id: "hero", name: "The Hero", description: "The brave one who leads the quest" },
      { id: "wizard", name: "The Wizard", description: "The wise one with magical knowledge" },
      { id: "knight", name: "The Knight", description: "The protector with a loyal heart" },
      { id: "pet", name: "The Companion", description: "A faithful friend (pet role)" },
    ],
  },
  "fairy-glade": {
    id: "2",
    slug: "fairy-glade",
    title: "The Fairy Glade",
    tagline: "Follow the fireflies past the mushroom houses to a glade where the fairies are waiting.",
    description: "A magical journey through an enchanted forest where your family discovers the secret world of the fairies.",
    cover_image_url: null,
    page_count: 24,
    category: "magical",
    is_featured: true,
    roles: [
      { id: "seeker", name: "The Seeker", description: "The curious one who finds the path" },
      { id: "dreamer", name: "The Dreamer", description: "The imaginative one who sees magic" },
      { id: "guardian", name: "The Guardian", description: "The one who protects the group" },
      { id: "pet", name: "The Sprite", description: "A magical creature friend (pet role)" },
    ],
  },
  "grand-final-day": {
    id: "3",
    slug: "grand-final-day",
    title: "Grand Final Day",
    tagline: "One game, one final siren, and a whole family in the stands cheering.",
    description: "The big game is here! Your family stars in this heartwarming sports story about teamwork and never giving up.",
    cover_image_url: null,
    page_count: 24,
    category: "sports",
    is_featured: false,
    roles: [
      { id: "star", name: "The Star Player", description: "The one who makes the winning play" },
      { id: "captain", name: "The Captain", description: "The team leader who rallies everyone" },
      { id: "rookie", name: "The Rookie", description: "The newcomer learning the game" },
      { id: "mascot", name: "The Mascot", description: "The team spirit (pet role)" },
    ],
  },
  "cloud-ship": {
    id: "4",
    slug: "cloud-ship",
    title: "Captain of the Cloud Ship",
    tagline: "Your little one takes the helm of a flying ship, with family as the crew.",
    description: "Set sail through the clouds on an adventure above the world, with your child as the brave captain.",
    cover_image_url: null,
    page_count: 24,
    category: "adventure",
    is_featured: true,
    roles: [
      { id: "captain", name: "The Captain", description: "Commands the ship through the skies" },
      { id: "navigator", name: "The Navigator", description: "Charts the course through the clouds" },
      { id: "engineer", name: "The Engineer", description: "Keeps the ship flying" },
      { id: "parrot", name: "The Sky Parrot", description: "A feathered first mate (pet role)" },
    ],
  },
  "super-squad": {
    id: "5",
    slug: "super-squad",
    title: "The Super Squad and the Sorceress",
    tagline: "A cheeky sorceress is turning the city upside down. Time to suit up.",
    description: "Your family becomes a team of superheroes to save the city from a mischievous but not-so-evil sorceress.",
    cover_image_url: null,
    page_count: 24,
    category: "superhero",
    is_featured: false,
    roles: [
      { id: "leader", name: "The Leader", description: "The one who brings the team together" },
      { id: "flyer", name: "The Flyer", description: "Soars above to scout ahead" },
      { id: "strong", name: "The Strong One", description: "Lifts anything to help the team" },
      { id: "sidekick", name: "The Sidekick", description: "A super-powered pet (pet role)" },
    ],
  },
  "galaxy-road-trip": {
    id: "6",
    slug: "galaxy-road-trip",
    title: "The Great Galaxy Road Trip",
    tagline: "An old rocket turns out to be the fastest ride in the galaxy — and home before bedtime.",
    description: "Blast off on a cosmic adventure through the solar system and beyond with your family as space explorers.",
    cover_image_url: null,
    page_count: 24,
    category: "space",
    is_featured: true,
    roles: [
      { id: "commander", name: "The Commander", description: "Leads the space mission" },
      { id: "pilot", name: "The Pilot", description: "Flies through asteroid fields" },
      { id: "scientist", name: "The Scientist", description: "Discovers alien wonders" },
      { id: "alien", name: "The Alien Buddy", description: "A friendly creature from space (pet role)" },
    ],
  },
};

// GET /api/stories/[slug] - Get a single story with roles (public, no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const supabase = createServiceClient();

    const { data: story, error } = await supabase
      .from("stories")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !story) {
      // Try demo data
      const demoStory = demoStories[slug];
      if (demoStory) {
        return NextResponse.json({ story: demoStory });
      }
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    // Add default roles based on story (in production, these would be in DB)
    const roles = demoStories[slug]?.roles || [
      { id: "hero", name: "The Hero", description: "The main character" },
      { id: "sidekick", name: "The Sidekick", description: "The loyal companion" },
      { id: "helper", name: "The Helper", description: "A helpful friend" },
      { id: "pet", name: "The Pet", description: "A faithful animal friend" },
    ];

    return NextResponse.json({ story: { ...story, roles } });
  } catch (error) {
    console.error("Story fetch error:", error);
    const demoStory = demoStories[slug];
    if (demoStory) {
      return NextResponse.json({ story: demoStory });
    }
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }
}
