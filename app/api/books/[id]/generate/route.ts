import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getOpenAI } from "@/lib/openai";
import { checkTokens, deductTokens } from "@/lib/tokens";
import { TOKEN_COSTS } from "@/lib/types";
import {
  loadBlueprint,
  loadBlueprintCover,
  buildPromptFromBlueprint,
  getOriginalImagePath,
  resolveBookId,
  type CrewAssignment,
  type BookBlueprint,
  type BlueprintPage,
} from "@/lib/book-blueprints";
import {
  downloadImage,
  loadLocalImage,
  selectOutputSize,
  type ProcessedImage,
} from "@/lib/image-processing";

// Character from database
interface CharacterInput {
  id: string;
  name: string;
  character_type?: string;
  pet_type?: string;
  age?: number | null;
  generated_image_url?: string;
  identity_profile?: {
    hair: { color: string; style: string; length?: string };
    eyes: { color: string };
    skinTone: string;
    distinctiveFeatures?: string[];
  } | null;
  identity_confirmed?: boolean;
}

// Map customer character type to crew slot type
function matchCharacterToSlotType(
  character: CharacterInput
): "adult" | "child" | "baby" | "dog" | "other" {
  const { character_type, pet_type, age } = character;

  if (character_type === "pet") {
    if (pet_type === "dog") return "dog";
    return "other";
  }
  if (character_type === "person") {
    // Use age to determine adult vs child
    if (age !== null && age !== undefined) {
      if (age < 2) return "baby";
      if (age < 18) return "child";
      return "adult";
    }
    // Default to child if no age
    return "child";
  }
  return "other";
}

// Assign customer characters to crew slots based on type matching
function assignCharactersToSlots(
  characters: CharacterInput[],
  blueprint: BookBlueprint,
  page: BlueprintPage
): { assignments: CrewAssignment[]; debugLog: string[] } {
  const assignments: CrewAssignment[] = [];
  const usedSlots = new Set<string>();
  const usedCharacters = new Set<string>();
  const debugLog: string[] = [];

  debugLog.push("=== CHARACTER TO SLOT ASSIGNMENT DEBUG ===");
  debugLog.push("");

  // Log input characters
  debugLog.push("INPUT CHARACTERS:");
  characters.forEach((char, i) => {
    const mappedType = matchCharacterToSlotType(char);
    debugLog.push(`  ${i + 1}. "${char.name}" (ID: ${char.id.substring(0, 8)}...)`);
    debugLog.push(`     - character_type: ${char.character_type || "undefined"}`);
    debugLog.push(`     - pet_type: ${char.pet_type || "undefined"}`);
    debugLog.push(`     - age: ${char.age ?? "undefined"}`);
    debugLog.push(`     - MAPPED TO: ${mappedType}`);
    debugLog.push(`     - has generated_image_url: ${!!char.generated_image_url}`);
  });
  debugLog.push("");

  // Get available slots from the page's character placements
  const availableSlots = page.characterPlacements
    .map((placement) => {
      const slot = blueprint.characters.crewSlots.find(
        (s) => s.slotId === placement.slotId
      );
      return slot ? { placement, slot } : null;
    })
    .filter(Boolean) as { placement: typeof page.characterPlacements[0]; slot: typeof blueprint.characters.crewSlots[0] }[];

  // Log available slots
  debugLog.push("AVAILABLE CREW SLOTS (from blueprint):");
  availableSlots.forEach((item, i) => {
    debugLog.push(`  ${i + 1}. ${item.slot.slotId}`);
    debugLog.push(`     - characterType: ${item.slot.characterType}`);
    debugLog.push(`     - archetype: ${item.slot.archetype}`);
    debugLog.push(`     - position: ${item.slot.position}`);
    debugLog.push(`     - required: ${item.slot.required}`);
  });
  debugLog.push("");

  // Sort slots by priority (required first, then by type preference)
  const sortedSlots = [...availableSlots].sort((a, b) => {
    if (a.slot.required && !b.slot.required) return -1;
    if (!a.slot.required && b.slot.required) return 1;
    return 0;
  });

  debugLog.push("PASS 1: EXACT TYPE MATCHING");
  // First pass: exact type matching
  for (const character of characters) {
    if (usedCharacters.has(character.id)) continue;

    const charType = matchCharacterToSlotType(character);
    debugLog.push(`  Trying to match "${character.name}" (type: ${charType})...`);

    let matched = false;
    // Find best matching slot
    for (const { slot } of sortedSlots) {
      if (usedSlots.has(slot.slotId)) {
        continue;
      }

      // Exact type match
      if (slot.characterType === charType) {
        assignments.push({
          slotId: slot.slotId,
          characterId: character.id,
          characterName: character.name,
          imageIndex: assignments.length + 2, // IMAGE 2, 3, 4...
        });
        usedSlots.add(slot.slotId);
        usedCharacters.add(character.id);
        debugLog.push(`    ✓ MATCHED to ${slot.slotId} (exact type: ${charType})`);
        matched = true;
        break;
      }
    }
    if (!matched) {
      debugLog.push(`    ✗ No exact match found for type "${charType}"`);
    }
  }
  debugLog.push("");

  debugLog.push("PASS 2: FILL REMAINING PEOPLE INTO PEOPLE SLOTS");
  // Second pass: fill remaining PEOPLE into any available PEOPLE slot (adult/child/baby, NOT dog/other)
  for (const character of characters) {
    if (usedCharacters.has(character.id)) {
      debugLog.push(`  "${character.name}" already assigned, skipping`);
      continue;
    }

    const charType = matchCharacterToSlotType(character);
    const isPerson = charType === "adult" || charType === "child" || charType === "baby";

    if (!isPerson) {
      debugLog.push(`  "${character.name}" is not a person (type: ${charType}), will try in pass 3`);
      continue;
    }

    debugLog.push(`  Trying to place person "${character.name}" (type: ${charType}) in any PEOPLE slot...`);

    let placed = false;
    for (const { slot } of sortedSlots) {
      if (usedSlots.has(slot.slotId)) {
        continue;
      }

      // Only place people in people slots (not dog/other)
      const slotIsPeople = slot.characterType === "adult" || slot.characterType === "child" || slot.characterType === "baby";
      if (!slotIsPeople) {
        debugLog.push(`    - Skipping ${slot.slotId} (slot type: ${slot.characterType}) - not a people slot`);
        continue;
      }

      assignments.push({
        slotId: slot.slotId,
        characterId: character.id,
        characterName: character.name,
        imageIndex: assignments.length + 2,
      });
      usedSlots.add(slot.slotId);
      usedCharacters.add(character.id);
      debugLog.push(`    ✓ PLACED in ${slot.slotId} (slot expects: ${slot.characterType}, char is: ${charType})`);
      placed = true;
      break;
    }
    if (!placed) {
      debugLog.push(`    ✗ NO PEOPLE SLOTS AVAILABLE for "${character.name}"`);
    }
  }
  debugLog.push("");

  debugLog.push("PASS 3: FILL REMAINING PETS INTO PET SLOTS");
  // Third pass: fill remaining pets into any available pet slot
  for (const character of characters) {
    if (usedCharacters.has(character.id)) continue;

    const charType = matchCharacterToSlotType(character);
    const isPet = charType === "dog" || charType === "other";

    if (!isPet) continue;

    debugLog.push(`  Trying to place pet "${character.name}" (type: ${charType}) in any PET slot...`);

    let placed = false;
    for (const { slot } of sortedSlots) {
      if (usedSlots.has(slot.slotId)) continue;

      // Only place pets in pet slots
      const slotIsPet = slot.characterType === "dog" || slot.characterType === "other";
      if (!slotIsPet) continue;

      assignments.push({
        slotId: slot.slotId,
        characterId: character.id,
        characterName: character.name,
        imageIndex: assignments.length + 2,
      });
      usedSlots.add(slot.slotId);
      usedCharacters.add(character.id);
      debugLog.push(`    ✓ PLACED in ${slot.slotId} (slot expects: ${slot.characterType}, char is: ${charType})`);
      placed = true;
      break;
    }
    if (!placed) {
      debugLog.push(`    ✗ NO PET SLOTS AVAILABLE for "${character.name}"`);
    }
  }
  debugLog.push("");

  debugLog.push("FINAL ASSIGNMENTS:");
  if (assignments.length === 0) {
    debugLog.push("  (none)");
  } else {
    assignments.forEach((a) => {
      debugLog.push(`  IMAGE ${a.imageIndex}: "${a.characterName}" -> ${a.slotId}`);
    });
  }

  // Check for unassigned characters
  const unassignedChars = characters.filter((c) => !usedCharacters.has(c.id));
  if (unassignedChars.length > 0) {
    debugLog.push("");
    debugLog.push("⚠️  UNASSIGNED CHARACTERS (will NOT appear in image):");
    unassignedChars.forEach((c) => {
      debugLog.push(`  - "${c.name}" (type: ${matchCharacterToSlotType(c)})`);
    });
  }

  debugLog.push("");
  debugLog.push("=== END ASSIGNMENT DEBUG ===");

  return { assignments, debugLog };
}

// POST /api/books/[id]/generate - Generate cover page using blueprint system
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

    if (book.status === "generating") {
      return NextResponse.json(
        { error: "Generation already in progress" },
        { status: 400 }
      );
    }

    // Check tokens
    const tokenCost = TOKEN_COSTS.BOOK_COVER;
    const { hasEnough, balance } = await checkTokens(supabase, user.id, tokenCost);

    if (!hasEnough) {
      return NextResponse.json(
        {
          error: "Insufficient tokens",
          required: tokenCost,
          balance,
          message: `You need ${tokenCost} token for a book cover but only have ${balance}.`,
        },
        { status: 402 }
      );
    }

    // Get generation params
    const body = await request.json().catch(() => ({}));
    const rawBookId = body.bookId || book.metadata?.bookId || book.metadata?.storySlug;
    const characterIds: string[] =
      body.characterIds || book.metadata?.characterIds || [];

    if (!rawBookId) {
      return NextResponse.json(
        { error: "Missing book selection" },
        { status: 400 }
      );
    }

    // Resolve the book ID (handles old slugs like "dragon-castle-valley" -> "the-dragon-of-castle-valley")
    const bookId = resolveBookId(rawBookId);
    console.log(`Book ID resolved: "${rawBookId}" -> "${bookId}"`);

    // Enforce max 5 characters
    if (characterIds.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 characters allowed per book" },
        { status: 400 }
      );
    }

    if (characterIds.length === 0) {
      return NextResponse.json(
        { error: "At least one character is required" },
        { status: 400 }
      );
    }

    // ============================================
    // Load book blueprint
    // ============================================
    let blueprint: BookBlueprint;
    let coverPage: BlueprintPage;

    try {
      blueprint = await loadBlueprint(bookId);
      coverPage = await loadBlueprintCover(bookId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      if (msg.includes("BLUEPRINT_NOT_FOUND")) {
        return NextResponse.json(
          {
            error: "BLUEPRINT_NOT_FOUND",
            message: `No blueprint found for book "${bookId}". Please ensure the book blueprint JSON exists.`,
          },
          { status: 400 }
        );
      }
      throw error;
    }

    // Validate cover has original image
    if (!coverPage.originalImage) {
      return NextResponse.json(
        {
          error: "MASTER_IMAGE_REQUIRED",
          message: `Book "${blueprint.title}" cover page has no original image configured.`,
        },
        { status: 400 }
      );
    }

    // Fetch characters from database
    let charData: CharacterInput[] | null = null;
    let charError: { message: string } | null = null;

    const { data: data1, error: error1 } = await supabase
      .from("characters")
      .select("id, name, character_type, pet_type, age, generated_image_url, identity_profile, identity_confirmed")
      .in("id", characterIds);

    if (error1?.message?.includes("age") || error1?.message?.includes("identity")) {
      // Some columns don't exist, try minimal query
      console.log("Some columns not found, fetching minimal set");
      const { data: data2, error: error2 } = await supabase
        .from("characters")
        .select("id, name, character_type, pet_type, generated_image_url")
        .in("id", characterIds);
      charData = data2;
      charError = error2;
    } else {
      charData = data1;
      charError = error1;
    }

    if (charError) {
      return NextResponse.json(
        { error: `Failed to fetch characters: ${charError.message}` },
        { status: 500 }
      );
    }

    const characters: CharacterInput[] = charData || [];

    // Validate all characters have generated images
    const missingImages = characters.filter((c) => !c.generated_image_url);
    if (missingImages.length > 0) {
      const names = missingImages.map((c) => c.name).join(", ");
      return NextResponse.json(
        {
          error: `Character illustrations required: ${names}`,
          missingCharacters: missingImages.map((c) => ({ id: c.id, name: c.name })),
        },
        { status: 400 }
      );
    }

    // Update status to generating
    await supabase.from("books").update({ status: "generating" }).eq("id", id);

    // ============================================
    // Assign characters to crew slots
    // ============================================
    const { assignments: crewAssignments, debugLog: assignmentDebug } = assignCharactersToSlots(characters, blueprint, coverPage);

    // Log the detailed assignment debug info
    console.log("\n" + assignmentDebug.join("\n") + "\n");

    // Enrich crew assignments with identity profiles
    crewAssignments.forEach((assignment) => {
      const char = characters.find((c) => c.id === assignment.characterId);
      if (char?.identity_profile && char?.identity_confirmed) {
        assignment.identityProfile = char.identity_profile as {
          hair: { color: string; style: string; length?: string };
          eyes: { color: string };
          skinTone: string;
          distinctiveFeatures?: string[];
        };
      }
    });

    console.log("=== BOOK COVER GENERATION (Blueprint System) ===");
    console.log(`Book: ${blueprint.title} (${bookId})`);
    console.log(`Visual Style: ${blueprint.visualStyle.substring(0, 100)}...`);
    console.log(`Original Image: ${coverPage.originalImage}`);
    console.log(`Dimensions: ${coverPage.composition.dimensions.width}x${coverPage.composition.dimensions.height}`);
    console.log(`Characters provided: ${characters.length}`);
    console.log(`Crew slots in blueprint: ${blueprint.characters.crewSlots.length}`);
    console.log(`Assignments made: ${crewAssignments.length}`);
    console.log(`\nCrew Assignments (${crewAssignments.length}):`);
    crewAssignments.forEach((a) => {
      const hasIdentity = a.identityProfile ? " [IDENTITY LOCKED]" : "";
      console.log(`  ${a.slotId} -> "${a.characterName}" (IMAGE ${a.imageIndex})${hasIdentity}`);
    });
    console.log(`\nBook Characters (protected): ${blueprint.characters.bookCharacters.length}`);
    blueprint.characters.bookCharacters.forEach((c) => {
      console.log(`  - ${c.name}: ${c.description.substring(0, 50)}...`);
    });

    // ============================================
    // Load master page from local files
    // ============================================
    const masterImagePath = getOriginalImagePath(coverPage);
    let masterPage: ProcessedImage;

    try {
      masterPage = await loadLocalImage(masterImagePath, "Master page (cover)");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      if (msg.includes("MASTER_IMAGE_MISSING")) {
        await supabase.from("books").update({ status: "failed" }).eq("id", id);
        return NextResponse.json(
          {
            error: "MASTER_IMAGE_NOT_FOUND",
            message: `The master illustration for "${blueprint.title}" could not be loaded. File: ${masterImagePath}`,
          },
          { status: 500 }
        );
      }
      throw error;
    }

    // Download customer character images
    const characterImages: ProcessedImage[] = [];
    for (const assignment of crewAssignments) {
      const character = characters.find((c) => c.id === assignment.characterId);
      if (character?.generated_image_url) {
        const image = await downloadImage(
          character.generated_image_url,
          `Character "${character.name}"`
        );
        characterImages.push(image);
      }
    }

    // ============================================
    // Build prompt from blueprint
    // ============================================
    const prompt = buildPromptFromBlueprint(blueprint, coverPage, crewAssignments);

    console.log("\n=== FULL PROMPT SENT TO OPENAI ===");
    console.log("Prompt length:", prompt.length, "characters");
    console.log("-".repeat(80));
    console.log(prompt);
    console.log("-".repeat(80));
    console.log("=== END FULL PROMPT ===\n");

    const openai = getOpenAI();
    const serviceClient = createServiceClient();

    // ============================================
    // Build image array: IMAGE 1 = master, IMAGES 2+ = crew
    // ============================================
    const allImageFiles: File[] = [];

    // IMAGE 1: Master page (REQUIRED)
    const masterBlob = new Blob([new Uint8Array(masterPage.buffer)], {
      type: "image/png",
    });
    const masterFile = new File([masterBlob], "1-master-page.png", {
      type: "image/png",
    });
    allImageFiles.push(masterFile);
    console.log(
      `IMAGE 1: Master page (${masterPage.dimensions.width}x${masterPage.dimensions.height})`
    );

    // IMAGES 2+: Customer character references
    characterImages.forEach((image, index) => {
      const assignment = crewAssignments[index];
      const imageNum = index + 2;
      const blob = new Blob([new Uint8Array(image.buffer)], { type: "image/png" });
      const charName = assignment.characterName.replace(/[^a-zA-Z0-9]/g, "-");
      const file = new File([blob], `${imageNum}-crew-${charName}.png`, {
        type: "image/png",
      });
      allImageFiles.push(file);
      console.log(
        `IMAGE ${imageNum}: "${assignment.characterName}" -> ${assignment.slotId}`
      );
    });

    // ============================================
    // Determine output size based on original image
    // ============================================
    const outputSize = selectOutputSize(masterPage.dimensions);
    console.log(
      `\nOutput size: ${outputSize} (original: ${masterPage.dimensions.orientation})`
    );

    // ============================================
    // Call OpenAI images.edit
    // ============================================
    console.log("\nCalling OpenAI images.edit...");
    console.log(
      `Settings: model=gpt-image-2.5-sunburst, size=${outputSize}, quality=high, output=jpeg`
    );
    console.log(`Total images: ${allImageFiles.length}`);

    const startTime = Date.now();
    console.log("Calling OpenAI images.edit at:", new Date().toISOString());

    const response = await openai.images.edit({
      model: "gpt-image-2.5-sunburst",
      image: allImageFiles,
      prompt,
      n: 1,
      size: outputSize as "1024x1024" | "1536x1024" | "1024x1536",
      quality: "high",
      output_format: "jpeg",
    });

    const elapsedTime = Date.now() - startTime;
    console.log(`\n=== OPENAI RESPONSE ===`);
    console.log(`Response received in: ${elapsedTime}ms`);
    console.log(`Response data count: ${response.data?.length || 0}`);

    const imageData = response.data?.[0];
    let outputBuffer: Buffer | null = null;

    if (imageData?.b64_json) {
      console.log("Response type: base64 encoded image");
      console.log(`Base64 length: ${imageData.b64_json.length} chars`);
      outputBuffer = Buffer.from(imageData.b64_json, "base64");
    } else if (imageData?.url) {
      console.log("Response type: URL");
      console.log(`Image URL: ${imageData.url.substring(0, 100)}...`);
      const imgResponse = await fetch(imageData.url);
      if (!imgResponse.ok) {
        throw new Error(
          `Failed to download generated image. Status: ${imgResponse.status}`
        );
      }
      outputBuffer = Buffer.from(await imgResponse.arrayBuffer());
    } else {
      console.log("Response type: UNKNOWN or EMPTY");
      console.log("Full response:", JSON.stringify(response, null, 2));
    }

    if (!outputBuffer) {
      throw new Error("OpenAI returned no image data");
    }

    console.log(`Image buffer size: ${outputBuffer.length} bytes (${(outputBuffer.length / 1024).toFixed(1)} KB)`);
    console.log("=== END OPENAI RESPONSE ===\n");

    // Upload to storage
    const fileName = `${user.id}/${id}/cover.jpg`;
    const { error: uploadError } = await serviceClient.storage
      .from("previews")
      .upload(fileName, outputBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = serviceClient.storage.from("previews").getPublicUrl(fileName);

    console.log("Cover uploaded:", publicUrl);

    const generatedPages = [
      {
        page_number: 0,
        url: publicUrl,
        title: blueprint.title,
      },
    ];

    // ============================================
    // Store characters snapshot for resilient generation
    // ============================================
    const charactersSnapshot = characters.map((c) => ({
      id: c.id,
      name: c.name,
      character_type: c.character_type,
      pet_type: c.pet_type,
      age: c.age,
      generated_image_url: c.generated_image_url,
      identity_profile: c.identity_profile,
      identity_confirmed: c.identity_confirmed,
    }));

    // ============================================
    // Update book with generation metadata
    // ============================================
    const { data: updatedBook, error: updateError } = await supabase
      .from("books")
      .update({
        preview_pages: generatedPages,
        status: "preview_ready",
        characters_snapshot: charactersSnapshot,
        metadata: {
          ...book.metadata,
          bookId,
          blueprintVersion: blueprint.blueprintVersion,
          characterCount: characters.length,
          characterIds,
          crewAssignments,
          outputSize,
          masterImageUrl: masterImagePath,
          generatedAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Book update failed: ${updateError.message}`);
    }

    // Deduct tokens
    const deductResult = await deductTokens(
      supabase,
      user.id,
      tokenCost,
      "book_cover",
      id,
      `Cover: "${blueprint.title}" (${characters.length} characters)`
    );

    return NextResponse.json({
      book: updatedBook,
      pages: generatedPages,
      tokensUsed: tokenCost,
      tokensRemaining: deductResult.newBalance,
    });
  } catch (error) {
    console.error("=== GENERATION ERROR ===");
    console.error(error);

    // Update status to failed
    await supabase.from("books").update({ status: "failed" }).eq("id", id);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
