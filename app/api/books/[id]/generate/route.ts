import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getOpenAI, artStylePrompts } from "@/lib/openai";

// Story scene templates for each story
const storyScenes: Record<string, { title: string; scene: string }[]> = {
  "dragon-castle-valley": [
    { title: "The Journey Begins", scene: "The heroes gather at the edge of a misty valley, looking toward a glowing castle on a distant hill. A dragon's shadow passes overhead." },
    { title: "Crossing the Bridge", scene: "The brave adventurers carefully cross an ancient stone bridge over a deep ravine, with magical fireflies lighting their way." },
    { title: "Meeting the Dragon", scene: "Face to face with a magnificent but friendly dragon, scales shimmering with golden light, who guards the path to the castle." },
    { title: "The Castle Gates", scene: "Standing before the towering castle gates that glow with enchanted light, ready to enter and discover the treasure within." },
    { title: "Happily Ever After", scene: "Celebrating inside the grand castle hall, surrounded by magical treasures and new friends, the adventure complete." },
  ],
  "fairy-glade": [
    { title: "Following Fireflies", scene: "Walking through a moonlit forest, following a trail of glowing fireflies that lead deeper into the magical woods." },
    { title: "The Mushroom Village", scene: "Discovering tiny houses made from colorful mushrooms, with little doors and windows glowing warmly." },
    { title: "Meeting the Fairies", scene: "Surrounded by dancing fairies with sparkling wings, who sprinkle magic dust and laugh with joy." },
    { title: "The Fairy Queen", scene: "Bowing before the beautiful Fairy Queen on her flower throne, receiving a special magical gift." },
    { title: "Magic Forever", scene: "Returning home through the forest, now with fairy friends and a heart full of magic." },
  ],
  "grand-final-day": [
    { title: "Game Day Morning", scene: "Getting ready in the locker room, putting on team jerseys, feeling excited and a little nervous." },
    { title: "The Big Match", scene: "Running onto the field as the crowd cheers, the championship trophy gleaming in the sunlight." },
    { title: "Teamwork", scene: "Passing the ball between teammates, working together as one unit, determined to win." },
    { title: "The Winning Play", scene: "Making the final decisive play as the crowd holds their breath, everything moving in slow motion." },
    { title: "Champions", scene: "Celebrating with the trophy held high, confetti falling, family and friends cheering in the stands." },
  ],
  "cloud-ship": [
    { title: "Taking the Helm", scene: "Climbing aboard a magnificent flying ship with billowing sails, ready to sail through the clouds." },
    { title: "Above the Clouds", scene: "Soaring through fluffy white clouds with the wind in their hair, seeing rainbows and distant mountains below." },
    { title: "Sky Pirates", scene: "A friendly encounter with colorful sky pirates who share stories and treasures from distant lands." },
    { title: "The Storm", scene: "Navigating through a magical storm with lightning that looks like golden threads across purple clouds." },
    { title: "Safe Harbor", scene: "Landing the cloud ship safely home as the sun sets, with memories of incredible adventures in the sky." },
  ],
  "super-squad": [
    { title: "The Call to Action", scene: "Hearing the alarm and rushing to put on superhero costumes, ready to save the day." },
    { title: "Flying to Help", scene: "Soaring over the city skyline, capes flapping in the wind, following a trail of magical mischief." },
    { title: "The Sorceress", scene: "Meeting a playful sorceress with a pointy hat who is turning buildings into candy and cars into toy animals." },
    { title: "Using Powers", scene: "Working together as a team, each using their special power to help undo the silly magic spells." },
    { title: "Heroes Celebrated", scene: "Receiving medals from the mayor as the whole city cheers, the sorceress now a friend who promises to use magic for good." },
  ],
  "galaxy-road-trip": [
    { title: "Blast Off", scene: "Climbing into a colorful rocket ship shaped like a vintage car, counting down and launching into the stars." },
    { title: "Passing the Moon", scene: "Waving at friendly moon creatures while zooming past craters and lunar mountains." },
    { title: "Planet Hopping", scene: "Visiting strange and wonderful planets with rings, moons, and alien creatures who love to wave hello." },
    { title: "Space Diner", scene: "Stopping at a floating space diner run by friendly aliens, eating zero-gravity ice cream that floats around." },
    { title: "Home Before Bedtime", scene: "Landing softly in the backyard just as the stars come out, tired but full of cosmic memories." },
  ],
};

// POST /api/books/[id]/generate - Generate preview pages
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get the book
    const { data: book, error: fetchError } = await supabase
      .from("books")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Check if already generating
    if (book.status === "generating") {
      return NextResponse.json(
        { error: "Generation already in progress" },
        { status: 400 }
      );
    }

    // Get generation params from request or book metadata
    const body = await request.json().catch(() => ({}));
    const storySlug = body.storySlug || book.metadata?.storySlug;
    const artStyle = body.artStyle || book.metadata?.artStyle || "glow";
    const characters = body.characters || book.metadata?.characters || [];

    if (!storySlug) {
      return NextResponse.json(
        { error: "Missing story selection" },
        { status: 400 }
      );
    }

    // Update status to generating
    await supabase
      .from("books")
      .update({ status: "generating" })
      .eq("id", id);

    // Get story scenes
    const scenes = storyScenes[storySlug] || storyScenes["dragon-castle-valley"];
    const styleModifier = artStylePrompts[artStyle] || artStylePrompts.glow;

    // Build character description
    const characterNames = characters.map((c: { name: string }) => c.name).join(", ");
    const characterDesc = characters.length > 0
      ? `The main characters are: ${characterNames}. Include them in the scene as warm, friendly storybook characters.`
      : "Include friendly storybook characters in the scene.";

    // Generate preview pages (3 pages for preview)
    const previewScenes = [scenes[0], scenes[2], scenes[4]]; // First, middle, last
    const openai = getOpenAI();
    const serviceClient = createServiceClient();
    const generatedPages: { page_number: number; url: string; title: string }[] = [];

    for (let i = 0; i < previewScenes.length; i++) {
      const scene = previewScenes[i];

      const prompt = `Children's picture book illustration for page ${i + 1}:
${scene.scene}
${characterDesc}
Art style: ${styleModifier}
High quality children's book illustration, warm and friendly, suitable for ages 4-10.
Wide landscape format, vibrant colors, detailed background.`;

      try {
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt,
          n: 1,
          size: "1792x1024", // Landscape for book pages
          quality: "standard",
        });

        const generatedUrl = response.data?.[0]?.url;

        if (generatedUrl) {
          // Download and upload to Supabase Storage
          const imageResponse = await fetch(generatedUrl);
          const imageBlob = await imageResponse.blob();

          const fileName = `${user.id}/${id}/page_${i + 1}.png`;

          const { error: uploadError } = await serviceClient.storage
            .from("previews")
            .upload(fileName, imageBlob, {
              contentType: "image/png",
              upsert: true,
            });

          if (!uploadError) {
            const { data: { publicUrl } } = serviceClient.storage
              .from("previews")
              .getPublicUrl(fileName);

            generatedPages.push({
              page_number: i + 1,
              url: publicUrl,
              title: scene.title,
            });
          }
        }
      } catch (genError) {
        console.error(`Error generating page ${i + 1}:`, genError);
        // Continue with other pages even if one fails
      }
    }

    // Update book with generated pages
    const { data: updatedBook, error: updateError } = await supabase
      .from("books")
      .update({
        preview_pages: generatedPages,
        status: generatedPages.length > 0 ? "preview_ready" : "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ book: updatedBook, pages: generatedPages });
  } catch (error) {
    console.error("Generation error:", error);

    // Update status to failed
    await supabase
      .from("books")
      .update({ status: "failed" })
      .eq("id", id);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate preview" },
      { status: 500 }
    );
  }
}
