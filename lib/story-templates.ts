/**
 * Story Templates with Complete Page Definitions
 * Each story has 5 character slots and full page metadata
 */

// Character slot in a scene
export interface CharacterSlot {
  slot: number; // 1-5, order of visual prominence
  role: string; // Hero, Companion, Guide, etc.
  action: string; // What they're doing in this scene
  position: string; // Where in the frame (foreground-center, left-side, etc.)
  required: boolean; // Can be omitted if fewer characters
}

// Page/Scene definition
export interface PageDefinition {
  pageNumber: number;
  title: string;
  sceneDescription: string;
  setting: string;
  mood: string;
  originalImageUrl: string | null; // URL to template page image (to be replaced)
  characters: CharacterSlot[];
}

// Complete story template
export interface StoryTemplate {
  slug: string;
  title: string;
  tagline: string;
  totalPages: number;
  coverPage: PageDefinition;
  pages: PageDefinition[];
  protectedCharacters: string[]; // Story characters that should NOT be replaced (e.g., dragons, fairies)
}

/**
 * All story templates
 * Each has 5 character slots - AI removes unused slots if crew is smaller
 */
export const STORY_TEMPLATES: Record<string, StoryTemplate> = {
  "dragon-castle-valley": {
    slug: "dragon-castle-valley",
    title: "The Dragon of Castle Valley",
    tagline: "A dragon guards the road to the glowing castle.",
    totalPages: 6,
    protectedCharacters: ["Golden Dragon", "The friendly dragon flying overhead"],
    coverPage: {
      pageNumber: 0,
      title: "The Dragon of Castle Valley",
      sceneDescription: "The heroes stand at the edge of a mystical valley, gazing at a magnificent glowing castle on a distant hilltop. A friendly golden dragon soars overhead against a dramatic sunset sky. This is the beginning of their grand adventure.",
      setting: "Mystical valley edge at sunset. Rolling green hills with ancient twisted trees. Glowing amber castle on distant hilltop. Purple and orange sunset sky with wispy clouds. Golden dragon silhouette flying overhead.",
      mood: "Exciting, hopeful, adventurous beginning",
      originalImageUrl: null, // TODO: Add template image URL
      characters: [
        { slot: 1, role: "Hero", action: "Standing boldly, pointing toward the distant castle", position: "foreground-center", required: true },
        { slot: 2, role: "Brave Companion", action: "Standing beside hero, one hand shielding eyes to look at dragon", position: "foreground-left", required: false },
        { slot: 3, role: "Wise Guide", action: "Holding an ancient map, nodding approvingly", position: "mid-ground-right", required: false },
        { slot: 4, role: "Loyal Friend", action: "Adjusting a backpack, looking determined", position: "mid-ground-left", required: false },
        { slot: 5, role: "Young Adventurer", action: "Gazing up at the dragon with wonder and excitement", position: "foreground-right", required: false },
      ],
    },
    pages: [
      {
        pageNumber: 1,
        title: "The Journey Begins",
        sceneDescription: "The group sets off down a winding path into the valley. Morning mist swirls around their feet as magical fireflies light their way through ancient trees.",
        setting: "Forest path at dawn. Misty atmosphere with golden morning light filtering through leaves. Bioluminescent fireflies floating. Cobblestone path winding through gnarled trees.",
        mood: "Mysterious, enchanting, early adventure",
        originalImageUrl: null,
        characters: [
          { slot: 1, role: "Hero", action: "Leading the group confidently down the path", position: "foreground-center", required: true },
          { slot: 2, role: "Brave Companion", action: "Walking alongside, catching a firefly in cupped hands", position: "foreground-right", required: false },
          { slot: 3, role: "Wise Guide", action: "Reading the map while walking", position: "mid-ground-left", required: false },
          { slot: 4, role: "Loyal Friend", action: "Helping the youngest over a log", position: "mid-ground-right", required: false },
          { slot: 5, role: "Young Adventurer", action: "Chasing fireflies with delight", position: "background-center", required: false },
        ],
      },
      {
        pageNumber: 2,
        title: "The Ancient Bridge",
        sceneDescription: "They carefully cross an ancient stone bridge over a deep ravine. The bridge is decorated with dragon carvings and glows with magical runes.",
        setting: "Ancient stone bridge over misty ravine. Dragon head carvings on pillars. Glowing blue runes along railings. Waterfall visible in background. Dramatic height with clouds below.",
        mood: "Tense, awe-inspiring, careful progress",
        originalImageUrl: null,
        characters: [
          { slot: 1, role: "Hero", action: "Walking bravely across the center of the bridge", position: "center-bridge", required: true },
          { slot: 2, role: "Brave Companion", action: "Right behind hero, looking down at the ravine nervously", position: "center-bridge-behind", required: false },
          { slot: 3, role: "Wise Guide", action: "At the start of bridge, gesturing to the runes explaining them", position: "bridge-entrance", required: false },
          { slot: 4, role: "Loyal Friend", action: "Helping steady someone across", position: "mid-bridge", required: false },
          { slot: 5, role: "Young Adventurer", action: "Holding the railing tightly, eyes wide", position: "bridge-entrance", required: false },
        ],
      },
      {
        pageNumber: 3,
        title: "Meeting the Dragon",
        sceneDescription: "Face to face with the magnificent golden dragon! But instead of being scary, the dragon has kind eyes and a gentle smile. It lowers its head to greet them.",
        setting: "Mountain clearing with the dragon's nest. Golden dragon with shimmering scales. Warm afternoon light. Treasure and gems scattered around. Dragon's kind eyes and gentle expression.",
        mood: "Wonder, relief, magical meeting",
        originalImageUrl: null,
        characters: [
          { slot: 1, role: "Hero", action: "Reaching out to touch the dragon's snout gently", position: "foreground-center", required: true },
          { slot: 2, role: "Brave Companion", action: "Standing with mouth open in amazement", position: "foreground-left", required: false },
          { slot: 3, role: "Wise Guide", action: "Bowing respectfully to the dragon", position: "mid-ground-right", required: false },
          { slot: 4, role: "Loyal Friend", action: "Taking a step back in awe but smiling", position: "mid-ground-left", required: false },
          { slot: 5, role: "Young Adventurer", action: "Jumping up and down with excitement", position: "foreground-right", required: false },
        ],
      },
      {
        pageNumber: 4,
        title: "Flying to the Castle",
        sceneDescription: "The dragon offers them a ride! They all climb onto the dragon's back and soar through the clouds toward the glowing castle, laughing with joy.",
        setting: "Flying through sunset clouds. Dragon's back with riders. Castle getting closer. Pink and gold clouds all around. Wind in hair, joyful expressions.",
        mood: "Exhilarating, joyful, freedom",
        originalImageUrl: null,
        characters: [
          { slot: 1, role: "Hero", action: "Sitting at front of dragon's neck, arms spread wide", position: "dragon-front", required: true },
          { slot: 2, role: "Brave Companion", action: "Right behind hero, holding on and laughing", position: "dragon-middle-front", required: false },
          { slot: 3, role: "Wise Guide", action: "Holding onto a spine, looking at map happily", position: "dragon-middle", required: false },
          { slot: 4, role: "Loyal Friend", action: "Helping hold the youngest secure", position: "dragon-middle-back", required: false },
          { slot: 5, role: "Young Adventurer", action: "Hugging dragon's neck, huge smile", position: "dragon-back", required: false },
        ],
      },
      {
        pageNumber: 5,
        title: "Happily Ever After",
        sceneDescription: "Inside the castle's grand hall, they celebrate their adventure. The dragon has become their friend, and the castle is now their magical home. The end of a perfect adventure.",
        setting: "Grand castle hall with high ceilings and stained glass. Golden chandeliers. Long table with feast. Dragon curled up nearby. Warm firelight. Celebratory atmosphere.",
        mood: "Triumphant, warm, happy ending",
        originalImageUrl: null,
        characters: [
          { slot: 1, role: "Hero", action: "Standing on chair raising a goblet in celebration", position: "center-table", required: true },
          { slot: 2, role: "Brave Companion", action: "Cheering alongside the hero", position: "left-of-hero", required: false },
          { slot: 3, role: "Wise Guide", action: "Sitting contentedly, smiling at the group", position: "table-end", required: false },
          { slot: 4, role: "Loyal Friend", action: "Feeding a treat to the dragon", position: "near-dragon", required: false },
          { slot: 5, role: "Young Adventurer", action: "Hugging the dragon's snout", position: "with-dragon", required: false },
        ],
      },
    ],
  },

  "fairy-glade": {
    slug: "fairy-glade",
    title: "The Fairy Glade",
    tagline: "Follow the fireflies to where the fairies are waiting.",
    totalPages: 6,
    protectedCharacters: ["Fairies", "Glowing fireflies", "Fairy houses"],
    coverPage: {
      pageNumber: 0,
      title: "The Fairy Glade",
      sceneDescription: "The adventurers stand at the entrance to an enchanted forest glade. Glowing fireflies create a magical path leading deeper into the woods. Tiny fairy houses nestle in giant colorful mushrooms, and sparkles of magic dust float in the moonlit air.",
      setting: "Moonlit forest glade entrance. Giant bioluminescent mushrooms in purple, blue, and pink. Tiny glowing fairy houses with round doors. Fireflies creating a dotted light path. Silver moonbeams through canopy. Magic dust particles floating.",
      mood: "Magical, wonder-filled, enchanting",
      originalImageUrl: null,
      characters: [
        { slot: 1, role: "Curious Explorer", action: "Reaching out to touch a hovering firefly", position: "foreground-center", required: true },
        { slot: 2, role: "Wonder-Struck Friend", action: "Looking up at floating fairies with jaw dropped", position: "foreground-right", required: false },
        { slot: 3, role: "Gentle Companion", action: "Kneeling to peek inside a tiny fairy house", position: "mid-ground-left", required: false },
        { slot: 4, role: "Excited Adventurer", action: "Holding a jar, trying to catch fairy dust", position: "mid-ground-right", required: false },
        { slot: 5, role: "Quiet Observer", action: "Standing back taking in the whole magical scene", position: "background-center", required: false },
      ],
    },
    pages: [], // TODO: Add full pages
  },

  "grand-final-day": {
    slug: "grand-final-day",
    title: "Grand Final Day",
    tagline: "One game, one final siren, one family cheering.",
    totalPages: 6,
    protectedCharacters: ["Trophy", "Stadium crowd in background", "Confetti"],
    coverPage: {
      pageNumber: 0,
      title: "Grand Final Day",
      sceneDescription: "The championship team stands proudly on a sunlit sports field. The golden trophy gleams nearby as colorful confetti falls from the bright blue sky. The stadium crowd goes wild in the background.",
      setting: "Sports stadium at golden hour. Lush green grass field with white line markings. Golden championship trophy on pedestal. Confetti falling everywhere. Packed stadium stands with cheering crowd. Clear blue sky.",
      mood: "Triumphant, celebratory, proud",
      originalImageUrl: null,
      characters: [
        { slot: 1, role: "Team Captain", action: "Lifting the trophy high above head with both hands", position: "foreground-center", required: true },
        { slot: 2, role: "Star Player", action: "Arms raised in V for victory, huge grin", position: "foreground-left", required: false },
        { slot: 3, role: "Team Mate", action: "Jumping with fists pumped", position: "foreground-right", required: false },
        { slot: 4, role: "Supportive Player", action: "Group hugging teammates", position: "mid-ground-left", required: false },
        { slot: 5, role: "Youngest Player", action: "Covered in confetti, jumping for joy", position: "mid-ground-right", required: false },
      ],
    },
    pages: [], // TODO: Add full pages
  },

  "cloud-ship": {
    slug: "cloud-ship",
    title: "Captain of the Cloud Ship",
    tagline: "Take the helm of a flying ship through the clouds.",
    totalPages: 6,
    protectedCharacters: ["Flying ship", "Rainbow", "Birds flying alongside", "Clouds"],
    coverPage: {
      pageNumber: 0,
      title: "Captain of the Cloud Ship",
      sceneDescription: "The crew stands on the deck of a magnificent flying galleon, sailing through a sea of fluffy white clouds. The ship has billowing golden sails and the sun creates a warm glow. Rainbows arc in the distance.",
      setting: "High above the clouds at golden hour. Magnificent wooden flying ship with golden sails. Fluffy white clouds below and around. Rainbow arcing in distance. Warm sunlight bathing everything in gold. Birds flying alongside.",
      mood: "Adventurous, free, majestic",
      originalImageUrl: null,
      characters: [
        { slot: 1, role: "Ship Captain", action: "At the helm, hands on wheel, looking heroic", position: "ship-wheel-center", required: true },
        { slot: 2, role: "First Mate", action: "Standing beside captain with telescope", position: "helm-right", required: false },
        { slot: 3, role: "Navigator", action: "Studying a magical floating holographic map", position: "deck-front", required: false },
        { slot: 4, role: "Lookout", action: "Pointing excitedly at the rainbow", position: "crow's-nest", required: false },
        { slot: 5, role: "Deckhand", action: "Pulling on rigging ropes with a smile", position: "deck-side", required: false },
      ],
    },
    pages: [], // TODO: Add full pages
  },

  "super-squad": {
    slug: "super-squad",
    title: "The Super Squad",
    tagline: "Suit up to save the city from a cheeky sorceress.",
    totalPages: 6,
    protectedCharacters: ["City skyline", "Dramatic sunset sky"],
    coverPage: {
      pageNumber: 0,
      title: "The Super Squad",
      sceneDescription: "The superhero team stands heroically on a rooftop, overlooking a colorful city skyline at golden hour. Their capes flutter in the breeze as they prepare to save the day. The sky behind them is dramatic with sunset colors.",
      setting: "City rooftop at sunset. Vibrant cityscape with colorful buildings below. Dramatic orange and purple sunset sky. Wind creating cape movement. Heroic backlit silhouette effect with sun behind.",
      mood: "Heroic, powerful, ready for action",
      originalImageUrl: null,
      characters: [
        { slot: 1, role: "Team Leader", action: "Power pose with hands on hips, cape flowing majestically", position: "foreground-center", required: true },
        { slot: 2, role: "Flying Hero", action: "Hovering slightly off the ground, ready to launch", position: "foreground-right-above", required: false },
        { slot: 3, role: "Strong Hero", action: "Arms crossed, muscles visible, confident stance", position: "foreground-left", required: false },
        { slot: 4, role: "Speed Hero", action: "Crouched in runner's starting position, blur effect", position: "mid-ground-right", required: false },
        { slot: 5, role: "Tech Hero", action: "Holding glowing gadget, holographic display visible", position: "mid-ground-left", required: false },
      ],
    },
    pages: [], // TODO: Add full pages
  },

  "galaxy-road-trip": {
    slug: "galaxy-road-trip",
    title: "The Great Galaxy Road Trip",
    tagline: "Blast off through the solar system and back before bedtime.",
    totalPages: 6,
    protectedCharacters: ["Spacecraft interior", "Planets visible through windows", "Stars and nebulae", "Control panels"],
    coverPage: {
      pageNumber: 0,
      title: "The Great Galaxy Road Trip",
      sceneDescription: "The crew looks out from inside a retro-futuristic rocket ship cockpit. Through the large curved windows, a dazzling galaxy spreads before them with colorful planets, sparkling stars, and swirling purple nebulae.",
      setting: "Inside spacecraft cockpit. Curved panoramic windows. Colorful control panels with glowing buttons. View of space with Saturn-like ringed planet, colorful nebula, countless stars. Cozy retro-futuristic interior.",
      mood: "Wonder-filled, exciting, cosmic adventure",
      originalImageUrl: null,
      characters: [
        { slot: 1, role: "Pilot", action: "Hands on controls, piloting through an asteroid field", position: "pilot-seat-center", required: true },
        { slot: 2, role: "Co-Pilot", action: "Pointing excitedly at a ringed planet through window", position: "co-pilot-seat", required: false },
        { slot: 3, role: "Navigator", action: "Reading a holographic star map projection", position: "navigation-station", required: false },
        { slot: 4, role: "Scientist", action: "Looking through a telescope at distant stars", position: "observation-window", required: false },
        { slot: 5, role: "Space Tourist", action: "Face pressed against window in total wonder", position: "side-window", required: false },
      ],
    },
    pages: [], // TODO: Add full pages
  },
};

/**
 * Get a story template by slug
 */
export function getStoryTemplate(slug: string): StoryTemplate | null {
  return STORY_TEMPLATES[slug] || null;
}

/**
 * Get all available story slugs
 */
export function getAvailableStorySlugs(): string[] {
  return Object.keys(STORY_TEMPLATES);
}
