import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Demo art styles for display before Supabase is configured
const demoArtStyles = [
  {
    id: "1",
    slug: "glow",
    name: "Enchanted glow",
    description: "Our signature look. Rich painted light, golden sparkles and starry skies — pure bedtime wonder.",
    preview_image_url: null,
    prompt_modifier: "rich painted light with golden sparkles and starry skies, warm enchanted atmosphere, magical glow effects",
    ages: "3–10",
  },
  {
    id: "2",
    slug: "watercolour",
    name: "Watercolour dream",
    description: "Soft washes and pastel skies that melt into the page. Gentle, calm and dreamy.",
    preview_image_url: null,
    prompt_modifier: "soft watercolor washes and pastel skies, gentle dreamy atmosphere, delicate brush strokes",
    ages: "0–5",
  },
  {
    id: "3",
    slug: "sketch",
    name: "Pencil sketch",
    description: "Hand-drawn graphite on cream paper, like an illustrator's sketchbook come to life.",
    preview_image_url: null,
    prompt_modifier: "hand-drawn graphite pencil on cream paper, detailed sketch style, illustrator's sketchbook feel",
    ages: "3–10",
  },
  {
    id: "4",
    slug: "papercut",
    name: "Paper-cut",
    description: "Layered paper and felt with real depth and texture, like a handmade pop-up book.",
    preview_image_url: null,
    prompt_modifier: "layered paper-cut collage with felt textures, 3D depth and shadows, handmade craft aesthetic",
    ages: "2–8",
  },
  {
    id: "5",
    slug: "anim",
    name: "3D animated",
    description: "Cinematic, glossy and bursting with colour, like stepping into an animated film.",
    preview_image_url: null,
    prompt_modifier: "3D animated Pixar-style, glossy cinematic rendering, vibrant colors and smooth surfaces",
    ages: "4–10",
  },
  {
    id: "6",
    slug: "silhouette",
    name: "Shadow silhouette",
    description: "Bold black silhouettes against a glowing sunset sky, like a shadow-puppet show.",
    preview_image_url: null,
    prompt_modifier: "bold black silhouettes against glowing sunset sky, shadow-puppet style, dramatic contrast",
    ages: "3–10",
  },
  {
    id: "7",
    slug: "bricks",
    name: "Toy bricks",
    description: "A whole world built from bright toy bricks — castles, dragons and all.",
    preview_image_url: null,
    prompt_modifier: "LEGO toy brick world, everything built from colorful plastic bricks, playful and geometric",
    ages: "3–10",
  },
];

// GET /api/art-styles - List all art styles (public, no auth required)
export async function GET() {
  try {
    const supabase = createServiceClient();

    const { data: artStyles, error } = await supabase
      .from("art_styles")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching art styles:", error);
      return NextResponse.json({ artStyles: demoArtStyles });
    }

    return NextResponse.json({ artStyles: artStyles || demoArtStyles });
  } catch (error) {
    console.error("Art styles fetch error:", error);
    return NextResponse.json({ artStyles: demoArtStyles });
  }
}
