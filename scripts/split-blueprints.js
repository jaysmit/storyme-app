/**
 * Script to split master blueprint JSON into individual book files
 */

const fs = require('fs');
const path = require('path');

const masterPath = path.join(__dirname, '..', 'storyme-cover-blueprints.json');
const outputDir = path.join(__dirname, '..', 'book-blueprints');

// Read master JSON
const master = JSON.parse(fs.readFileSync(masterPath, 'utf8'));

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Process each book
let bookCount = 0;
for (const [filename, bookData] of Object.entries(master.books)) {
  // Extract book ID from filename (remove .jpg extension)
  const bookId = filename.replace('.jpg', '');

  // Fix filename discrepancy: the-dragon-of-castle-valley(1).jpg -> the-dragon-of-castle-valley.jpg
  let correctedFilename = filename;
  if (filename === 'the-dragon-of-castle-valley(1).jpg') {
    correctedFilename = 'the-dragon-of-castle-valley.jpg';
  }
  const correctedBookId = correctedFilename.replace('.jpg', '');

  // Transform to new schema
  const blueprint = {
    schemaVersion: "1.0",
    bookId: correctedBookId,
    title: formatTitle(correctedBookId),
    blueprintVersion: 1,

    // Global generation rules from master
    globalRules: master.global_generation_rules,

    // Visual style for this book
    visualStyle: bookData.visual_style,

    // Character definitions
    characters: {
      // Book characters (protected story characters)
      bookCharacters: (bookData.book_characters || []).map((char, idx) => ({
        characterId: char.name || `book_char_${idx}`,
        name: char.name,
        description: char.description,
        preserve: char.preserve !== false,
        role: "story_character"
      })),

      // Crew slots (replaceable guest characters)
      crewSlots: (bookData.crew_slots || []).map(slot => ({
        slotId: `crew_${slot.slot_id}`,
        characterType: mapArchetypeToType(slot.archetype),
        archetype: slot.archetype,
        position: slot.position,
        poseAction: slot.pose_action,
        wardrobe: slot.wardrobe,
        replaceEntireCharacter: slot.replace_entire_character !== false,
        required: slot.slot_id === 'girl' || slot.slot_id === 'boy', // Primary characters required
        boundingBox: null, // To be annotated later
        assignedCharacterId: null // Populated at generation time
      }))
    },

    // Pages array (currently only cover)
    pages: [
      {
        pageId: "cover",
        pageNumber: 0,
        pageType: "cover",
        originalImage: correctedFilename,

        scene: {
          description: bookData.scene_description,
          visualStyle: bookData.visual_style
        },

        composition: {
          aspectRatio: bookData.aspect_ratio,
          dimensions: bookData.image_dimensions,
          notes: bookData.composition_notes
        },

        // Character placements for this page
        characterPlacements: (bookData.crew_slots || []).map(slot => ({
          slotId: `crew_${slot.slot_id}`,
          position: slot.position,
          poseAction: slot.pose_action,
          wardrobe: slot.wardrobe
        })),

        // Protected elements that must not change
        protectedElements: bookData.protected_elements || [],

        // Generation instructions
        generationInstructions: {
          editStrategy: bookData.edit_strategy,
          preserveBackground: true,
          preserveBookCharacters: true,
          maskStatus: bookData.crew_slot_geometry_status,
          reviewStatus: bookData.review_status
        }
      }
    ],

    // Metadata
    metadata: {
      crewCount: bookData.crew_count,
      bookCharacterCount: bookData.book_character_count,
      coordinateSystem: master.coordinate_system,
      classificationNote: master.classification_assumption
    }
  };

  // Write individual book file
  const outputPath = path.join(outputDir, `${correctedBookId}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(blueprint, null, 2));
  console.log(`Created: ${correctedBookId}.json`);
  bookCount++;
}

console.log(`\nMigration complete: ${bookCount} book blueprints created.`);

// Helper functions
function formatTitle(bookId) {
  return bookId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace(/\(1\)/, ''); // Remove (1) suffix if present
}

function mapArchetypeToType(archetype) {
  if (!archetype) return 'unknown';
  const lower = archetype.toLowerCase();
  if (lower.includes('grandmother') || lower.includes('adult')) return 'adult';
  if (lower.includes('girl') || lower.includes('boy') || lower.includes('child')) return 'child';
  if (lower.includes('baby') || lower.includes('infant')) return 'baby';
  if (lower.includes('dog')) return 'dog';
  return 'other';
}
