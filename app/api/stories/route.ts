import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Demo stories for display before Supabase is configured
const demoStories = [
  {
    id: "1",
    slug: "dragon-castle-valley",
    title: "The Dragon of Castle Valley",
    tagline: "A dragon guards the road to the glowing castle. Only a brave crew can win their way past.",
    description: "An epic fantasy adventure where your family must work together to outsmart a fearsome dragon and reach the enchanted castle.",
    cover_image_url: null,
    page_count: 24,
    category: "fantasy",
    is_featured: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    slug: "fairy-glade",
    title: "The Fairy Glade",
    tagline: "Follow the fireflies past the mushroom houses to a glade where the fairies are waiting.",
    description: "A magical journey through an enchanted forest where your family discovers the secret world of the fairies.",
    cover_image_url: null,
    page_count: 24,
    category: "magical",
    is_featured: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "3",
    slug: "grand-final-day",
    title: "Grand Final Day",
    tagline: "One game, one final siren, and a whole family in the stands cheering.",
    description: "The big game is here! Your family stars in this heartwarming sports story about teamwork and never giving up.",
    cover_image_url: null,
    page_count: 24,
    category: "sports",
    is_featured: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "4",
    slug: "cloud-ship",
    title: "Captain of the Cloud Ship",
    tagline: "Your little one takes the helm of a flying ship, with family as the crew.",
    description: "Set sail through the clouds on an adventure above the world, with your child as the brave captain.",
    cover_image_url: null,
    page_count: 24,
    category: "adventure",
    is_featured: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "5",
    slug: "super-squad",
    title: "The Super Squad and the Sorceress",
    tagline: "A cheeky sorceress is turning the city upside down. Time to suit up.",
    description: "Your family becomes a team of superheroes to save the city from a mischievous but not-so-evil sorceress.",
    cover_image_url: null,
    page_count: 24,
    category: "superhero",
    is_featured: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "6",
    slug: "galaxy-road-trip",
    title: "The Great Galaxy Road Trip",
    tagline: "An old rocket turns out to be the fastest ride in the galaxy — and home before bedtime.",
    description: "Blast off on a cosmic adventure through the solar system and beyond with your family as space explorers.",
    cover_image_url: null,
    page_count: 24,
    category: "space",
    is_featured: true,
    created_at: new Date().toISOString(),
  },
];

// GET /api/stories - List all stories (public, no auth required)
export async function GET() {
  try {
    const supabase = createServiceClient();

    const { data: stories, error } = await supabase
      .from("stories")
      .select("*")
      .order("is_featured", { ascending: false })
      .order("title", { ascending: true });

    if (error) {
      console.error("Error fetching stories:", error);
      // Return demo data if Supabase isn't configured
      return NextResponse.json({ stories: demoStories });
    }

    return NextResponse.json({ stories: stories || demoStories });
  } catch (error) {
    console.error("Stories fetch error:", error);
    return NextResponse.json({ stories: demoStories });
  }
}
