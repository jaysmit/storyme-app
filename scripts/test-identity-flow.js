// Test identity analysis flow with test image
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testIdentityFlow() {
  console.log('=== IDENTITY PROFILE TEST ===\n');

  // 1. Read test image
  const imagePath = path.join(__dirname, '../../assets/test.jpg');
  console.log('Loading test image:', imagePath);

  if (!fs.existsSync(imagePath)) {
    console.error('Test image not found!');
    process.exit(1);
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
  console.log(`Image loaded: ${(imageBuffer.length / 1024).toFixed(1)} KB\n`);

  // 2. Get or create test user
  let testUserId;
  const { data: users } = await supabase.auth.admin.listUsers();
  if (users?.users?.length > 0) {
    testUserId = users.users[0].id;
    console.log('Using existing user:', testUserId);
  } else {
    console.log('No users found - please create a test account first');
    process.exit(1);
  }

  // 3. Upload image to storage
  console.log('\nUploading photo to storage...');
  const fileName = `${testUserId}/test-identity-${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(fileName, imageBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (uploadError) {
    console.error('Upload error:', uploadError.message);
    // Try to continue with base64 URL
  }

  const { data: { publicUrl } } = supabase.storage
    .from('photos')
    .getPublicUrl(fileName);

  console.log('Photo URL:', publicUrl);

  // 4. Create test character
  console.log('\nCreating test character...');
  const { data: character, error: createError } = await supabase
    .from('characters')
    .insert({
      user_id: testUserId,
      name: 'Test Identity Profile',
      original_photo_url: publicUrl,
      character_type: 'person',
      generation_status: 'pending'
    })
    .select()
    .single();

  if (createError) {
    console.error('Create error:', createError.message);
    process.exit(1);
  }

  console.log('Character created:', character.id);

  // 5. Test identity analysis API
  console.log('\nCalling identity analysis API...');
  const analyzeUrl = `https://storyme-app-roan.vercel.app/api/characters/${character.id}/analyze`;

  // We need to call this as an authenticated request - let's do it directly with OpenAI instead
  const OpenAI = require('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  console.log('Analyzing photo with GPT-4 Vision...\n');

  const analysisPrompt = `Analyze this photo and extract physical attributes for a children's book character.

Return ONLY a valid JSON object with these exact fields:
{
  "hair": {
    "color": "specific hair color (e.g., 'dark brown', 'sandy blonde', 'auburn red', 'jet black', 'silver gray')",
    "style": "hairstyle (e.g., 'short and neat', 'long and wavy', 'curly bob', 'braided')",
    "texture": "hair texture if visible (e.g., 'straight', 'wavy', 'curly', 'coily')",
    "length": "short/medium/long"
  },
  "eyes": {
    "color": "specific eye color (e.g., 'bright blue', 'warm brown', 'hazel green', 'dark brown')",
    "shape": "eye shape if noticeable (e.g., 'round', 'almond', 'wide-set')"
  },
  "skinTone": "skin tone (e.g., 'fair', 'light', 'medium', 'olive', 'tan', 'brown', 'deep brown')",
  "faceShape": "face shape (e.g., 'oval', 'round', 'square', 'heart-shaped')",
  "distinctiveFeatures": ["array of unique features like 'freckles across nose', 'dimples', 'beauty mark on left cheek', 'glasses'"],
  "uncertainAttributes": ["array of features you cannot determine due to lighting, angle, or resolution"]
}

Be specific with colors - use descriptive terms like "dark brown" not just "brown".`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: analysisPrompt },
            { type: "image_url", image_url: { url: base64Image } }
          ]
        }
      ],
      max_tokens: 800,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    console.log('=== EXTRACTED IDENTITY PROFILE ===\n');

    const profile = JSON.parse(content);
    console.log('Hair:');
    console.log(`  Color: ${profile.hair?.color}`);
    console.log(`  Style: ${profile.hair?.style}`);
    console.log(`  Texture: ${profile.hair?.texture || 'not specified'}`);
    console.log(`  Length: ${profile.hair?.length || 'not specified'}`);
    console.log('\nEyes:');
    console.log(`  Color: ${profile.eyes?.color}`);
    console.log(`  Shape: ${profile.eyes?.shape || 'not specified'}`);
    console.log('\nSkin Tone:', profile.skinTone);
    console.log('Face Shape:', profile.faceShape || 'not specified');
    console.log('\nDistinctive Features:', profile.distinctiveFeatures?.join(', ') || 'none');
    console.log('Uncertain Attributes:', profile.uncertainAttributes?.join(', ') || 'none');

    // 6. Save identity profile to character
    console.log('\n=== SAVING TO DATABASE ===\n');

    const identityProfile = {
      version: 1,
      extractedAt: new Date().toISOString(),
      hair: profile.hair,
      eyes: profile.eyes,
      skinTone: profile.skinTone,
      faceShape: profile.faceShape,
      distinctiveFeatures: profile.distinctiveFeatures || [],
      uncertainAttributes: profile.uncertainAttributes || []
    };

    const { data: updated, error: updateError } = await supabase
      .from('characters')
      .update({
        identity_profile: identityProfile,
        identity_confirmed: false,
        identity_version: 1
      })
      .eq('id', character.id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError.message);
    } else {
      console.log('Identity profile saved successfully!');
      console.log('Character ID:', updated.id);
      console.log('Identity confirmed:', updated.identity_confirmed);
    }

    // 7. Verify it can be read back
    const { data: verify } = await supabase
      .from('characters')
      .select('id, name, identity_profile, identity_confirmed')
      .eq('id', character.id)
      .single();

    console.log('\n=== VERIFICATION ===\n');
    console.log('Stored profile:', JSON.stringify(verify.identity_profile, null, 2));

    console.log('\n=== TEST COMPLETE ===');
    console.log(`\nView character at: https://storyme-app-roan.vercel.app/characters`);
    console.log(`Character ID: ${character.id}`);

  } catch (error) {
    console.error('Analysis error:', error.message);
  }
}

testIdentityFlow().catch(console.error);
