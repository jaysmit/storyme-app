// Analyze existing characters that don't have identity profiles
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function analyzeCharacters() {
  console.log('=== ANALYZE EXISTING CHARACTERS ===\n');

  // Get characters without identity profiles
  const { data: characters, error } = await supabase
    .from('characters')
    .select('id, name, original_photo_url, identity_profile')
    .is('identity_profile', null)
    .not('original_photo_url', 'is', null);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`Found ${characters.length} characters without identity profiles\n`);

  for (const char of characters) {
    console.log(`Analyzing: ${char.name} (${char.id})`);

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this photo and extract physical attributes for a children's book character. Return JSON with: hair {color, style, texture, length}, eyes {color, shape}, skinTone, faceShape, distinctiveFeatures[], uncertainAttributes[]`
            },
            { type: 'image_url', image_url: { url: char.original_photo_url } }
          ]
        }],
        max_tokens: 800,
        response_format: { type: 'json_object' }
      });

      const profile = JSON.parse(response.choices[0].message.content);

      const identityProfile = {
        version: 1,
        extractedAt: new Date().toISOString(),
        hair: profile.hair || {},
        eyes: profile.eyes || {},
        skinTone: profile.skinTone,
        faceShape: profile.faceShape,
        distinctiveFeatures: profile.distinctiveFeatures || [],
        uncertainAttributes: profile.uncertainAttributes || []
      };

      await supabase
        .from('characters')
        .update({ identity_profile: identityProfile, identity_confirmed: false, identity_version: 1 })
        .eq('id', char.id);

      console.log(`  Hair: ${profile.hair?.color} - ${profile.hair?.style}`);
      console.log(`  Eyes: ${profile.eyes?.color}`);
      console.log(`  Skin: ${profile.skinTone}`);
      console.log(`  Done!\n`);

    } catch (e) {
      console.log(`  Error: ${e.message}\n`);
    }
  }

  console.log('=== COMPLETE ===');
}

analyzeCharacters();
