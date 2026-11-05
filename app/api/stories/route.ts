import { NextResponse } from "next/server";
import { listAvailableBooks, loadBlueprint } from "@/lib/book-blueprints";

// Category mapping for books
const BOOK_CATEGORIES: Record<string, string> = {
  "the-dragon-of-castle-valley": "fantasy",
  "the-fairy-glade": "magical",
  "grand-final-day": "sports",
  "captain-of-the-cloud-ship": "adventure",
  "the-super-squad-and-the-sorceress": "superhero",
  "the-great-galaxy-road-trip": "space",
  "the-crystal-asteroid": "space",
  "the-dinosaur-egg-dig": "adventure",
  "the-great-backyard-expedition": "adventure",
  "the-great-lighthouse-rescue": "adventure",
  "the-lost-jungle-temple": "adventure",
  "the-snow-globe-kingdom": "magical",
  "under-the-kelp-forest": "magical",
  "dragon-day-at-school": "fantasy",
  "the-birthday-that-wouldnt-end": "magical",
  "the-brick-by-brick-kingdom": "fantasy",
  "baby-brother": "family",
  "the-moon-borrowers": "magical",
  "the-outback-star-train": "adventure",
  "the-quest-for-unicorn-valley": "magical",
};

// Taglines for each book
const BOOK_TAGLINES: Record<string, string> = {
  "the-dragon-of-castle-valley": "A dragon guards the road to the glowing castle. Only a brave crew can win their way past.",
  "the-fairy-glade": "Follow the fireflies past the mushroom houses to a glade where the fairies are waiting.",
  "grand-final-day": "One game, one final siren, and a whole family in the stands cheering.",
  "captain-of-the-cloud-ship": "Your little one takes the helm of a flying ship, with family as the crew.",
  "the-super-squad-and-the-sorceress": "A cheeky sorceress is turning the city upside down. Time to suit up.",
  "the-great-galaxy-road-trip": "An old rocket turns out to be the fastest ride in the galaxy — and home before bedtime.",
  "the-crystal-asteroid": "On a grey cratered asteroid, a spacefaring family discovers floating fantasy islands and distant castles.",
  "the-dinosaur-egg-dig": "Dig deep into adventure and discover what's been waiting millions of years to hatch.",
  "the-great-backyard-expedition": "The biggest adventure is right outside your door — if you know where to look.",
  "the-great-lighthouse-rescue": "When the storm rolls in, it takes a brave crew to keep the light shining.",
  "the-lost-jungle-temple": "Deep in the jungle, ancient secrets await those curious enough to find them.",
  "the-snow-globe-kingdom": "Shake things up and step inside a world where winter never ends.",
  "under-the-kelp-forest": "Dive beneath the waves into a world of wonder and underwater friends.",
  "dragon-day-at-school": "When a dragon shows up at school, only your crew knows what to do.",
  "the-birthday-that-wouldnt-end": "The best birthday party ever? But what if it never stopped?",
  "the-brick-by-brick-kingdom": "Build your own adventure, one brick at a time.",
  "baby-brother": "A heartwarming story about welcoming a new family member.",
  "the-moon-borrowers": "Someone's been borrowing pieces of the moon. Can you find out who?",
  "the-outback-star-train": "All aboard for a magical journey across the outback under the stars.",
  "the-quest-for-unicorn-valley": "Follow the rainbow trail to the most magical place of all.",
};

// Featured books
const FEATURED_BOOKS = [
  "the-dragon-of-castle-valley",
  "the-fairy-glade",
  "captain-of-the-cloud-ship",
  "the-great-galaxy-road-trip",
  "the-snow-globe-kingdom",
  "the-crystal-asteroid",
];

// Build stories list from blueprints
async function buildStoriesFromBlueprints() {
  try {
    const bookIds = await listAvailableBooks();

    const stories = await Promise.all(
      bookIds.map(async (bookId, index) => {
        try {
          const blueprint = await loadBlueprint(bookId);
          const coverPage = blueprint.pages.find((p) => p.pageType === "cover");

          return {
            id: String(index + 1),
            slug: bookId,
            title: blueprint.title,
            tagline: BOOK_TAGLINES[bookId] || blueprint.visualStyle.substring(0, 100) + "...",
            description: coverPage?.scene?.description || blueprint.visualStyle,
            cover_image_url: coverPage?.originalImage ? `/images/${coverPage.originalImage}` : null,
            page_count: 24,
            category: BOOK_CATEGORIES[bookId] || "adventure",
            is_featured: FEATURED_BOOKS.includes(bookId),
            created_at: new Date().toISOString(),
          };
        } catch {
          return null;
        }
      })
    );

    // Filter out failed loads and sort
    return stories
      .filter(Boolean)
      .sort((a, b) => {
        // Featured first
        if (a!.is_featured && !b!.is_featured) return -1;
        if (!a!.is_featured && b!.is_featured) return 1;
        // Then by title
        return a!.title.localeCompare(b!.title);
      });
  } catch (error) {
    console.error("Failed to build stories from blueprints:", error);
    return [];
  }
}

// GET /api/stories - List all stories (public, no auth required)
// Now always reads from blueprints as the authoritative source
export async function GET() {
  try {
    const blueprintStories = await buildStoriesFromBlueprints();
    return NextResponse.json({ stories: blueprintStories });
  } catch (error) {
    console.error("Stories fetch error:", error);
    return NextResponse.json({ stories: [] });
  }
}
