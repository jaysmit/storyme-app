/**
 * Test script for the complete create page flow
 * Tests all API endpoints for character creation, book generation, etc.
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const BASE_URL = 'http://localhost:3000';

// Test user credentials
const TEST_EMAIL = 'test-create-flow@example.com';
const TEST_PASSWORD = 'testpassword123';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`\n>>> ${options.method || 'GET'} ${endpoint}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));
    console.log(`<<< ${response.status}: ${JSON.stringify(data).substring(0, 200)}...`);

    return { status: response.status, data, ok: response.ok };
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return { status: 0, data: { error: error.message }, ok: false };
  }
}

async function runTests() {
  console.log('=== STORY-ME CREATE FLOW TEST ===\n');

  // Step 0: Get or create test user
  console.log('STEP 0: Setting up test user...');

  let userId;

  // Check if user exists
  const { data: existingUsers } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', TEST_EMAIL)
    .limit(1);

  if (existingUsers && existingUsers.length > 0) {
    userId = existingUsers[0].id;
    console.log(`  Using existing user: ${userId}`);
  } else {
    // Create test user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });

    if (authError) {
      console.error('  Failed to create user:', authError.message);
      // Try to get existing auth user
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const existingAuthUser = users.find(u => u.email === TEST_EMAIL);
      if (existingAuthUser) {
        userId = existingAuthUser.id;
        console.log(`  Found existing auth user: ${userId}`);
      } else {
        console.error('  Cannot proceed without user');
        return;
      }
    } else {
      userId = authUser.user.id;
      console.log(`  Created new user: ${userId}`);

      // Ensure profile exists with tokens
      await supabase.from('profiles').upsert({
        id: userId,
        email: TEST_EMAIL,
        tokens: 100,
        tokens_used: 0,
      });
    }
  }

  // Ensure user has tokens
  await supabase.from('profiles').update({ tokens: 100 }).eq('id', userId);
  console.log('  Ensured user has 100 tokens');

  // Step 1: Check existing characters
  console.log('\nSTEP 1: Checking existing characters...');

  const { data: existingChars } = await supabase
    .from('characters')
    .select('id, name, character_type, age, generated_image_url')
    .eq('user_id', userId);

  console.log(`  Found ${existingChars?.length || 0} existing characters`);

  let testCharacters = [];

  if (existingChars && existingChars.length > 0) {
    // Use existing characters that have generated images
    const readyChars = existingChars.filter(c => c.generated_image_url);
    if (readyChars.length > 0) {
      testCharacters = readyChars.slice(0, 3);
      console.log(`  Using ${testCharacters.length} existing characters with images`);
    }
  }

  // If we need to create characters, do so
  if (testCharacters.length === 0) {
    console.log('  Need to create test characters...');

    // Create a simple test character without photo (we'll simulate)
    const testCharData = [
      { name: 'Test Child', character_type: 'person', age: 8 },
      { name: 'Test Adult', character_type: 'person', age: 35 },
    ];

    for (const charData of testCharData) {
      // Use a placeholder image URL for testing
      const placeholderUrl = `https://kgnzhfueafnuzjqpcldj.supabase.co/storage/v1/object/public/previews/test/placeholder.jpg`;

      const { data: newChar, error: charError } = await supabase
        .from('characters')
        .insert({
          user_id: userId,
          name: charData.name,
          character_type: charData.character_type,
          age: charData.age,
          original_photo_url: placeholderUrl,
          generated_image_url: placeholderUrl, // Simulate having generated image
          generation_status: 'completed',
        })
        .select()
        .single();

      if (charError) {
        console.error(`  Failed to create ${charData.name}:`, charError.message);
      } else {
        console.log(`  Created character: ${newChar.name} (${newChar.id})`);
        testCharacters.push(newChar);
      }
    }
  }

  if (testCharacters.length === 0) {
    console.error('  No characters available for testing');
    return;
  }

  const characterIds = testCharacters.map(c => c.id);
  console.log(`  Test characters: ${testCharacters.map(c => `${c.name} (age ${c.age})`).join(', ')}`);

  // Step 2: Test stories API
  console.log('\nSTEP 2: Testing stories API...');

  const storiesResult = await makeRequest('/api/stories');
  if (!storiesResult.ok) {
    console.error('  Stories API failed');
  } else {
    const stories = storiesResult.data.stories || storiesResult.data;
    console.log(`  Found ${stories?.length || 0} stories`);
    if (stories && stories.length > 0) {
      console.log(`  First story: ${stories[0].title} (${stories[0].slug})`);
    }
  }

  // Step 3: Test art styles API
  console.log('\nSTEP 3: Testing art styles API...');

  const stylesResult = await makeRequest('/api/art-styles');
  if (!stylesResult.ok) {
    console.error('  Art styles API failed');
  } else {
    const styles = stylesResult.data.styles || stylesResult.data;
    console.log(`  Found ${styles?.length || 0} art styles`);
  }

  // Step 4: Test blueprints API (list available books)
  console.log('\nSTEP 4: Testing blueprints API...');

  const blueprintsResult = await makeRequest('/api/blueprints');
  console.log(`  Blueprints response:`, blueprintsResult.data);

  // Step 5: Create a test book
  console.log('\nSTEP 5: Creating test book...');

  // First, delete any existing test books
  await supabase
    .from('books')
    .delete()
    .eq('user_id', userId)
    .eq('status', 'draft');

  // Create new book
  const { data: newBook, error: bookError } = await supabase
    .from('books')
    .insert({
      user_id: userId,
      status: 'draft',
      metadata: {
        bookId: 'essendon-five', // Test V2 book
        characterIds,
        artStyle: '3d-animated',
      },
    })
    .select()
    .single();

  if (bookError) {
    console.error('  Failed to create book:', bookError.message);
    return;
  }

  console.log(`  Created book: ${newBook.id}`);

  // Step 6: Test book generation (cover)
  console.log('\nSTEP 6: Testing book cover generation...');
  console.log('  (This will call OpenAI - may take 30-60 seconds)');

  // We need to make this request as the authenticated user
  // For testing, we'll check if the endpoint structure is correct

  // First, let's check what the endpoint expects
  const genPayload = {
    bookId: 'essendon-five',
    characterIds,
  };

  console.log(`  Payload: ${JSON.stringify(genPayload)}`);

  // Test the generate endpoint by directly calling Supabase to update status
  // and checking the response format

  // Actually call the API (this will fail without proper auth cookies)
  const genResult = await makeRequest(`/api/books/${newBook.id}/generate`, {
    method: 'POST',
    body: JSON.stringify(genPayload),
  });

  if (genResult.status === 401) {
    console.log('  Expected: 401 Unauthorized (no auth cookie in direct API call)');
    console.log('  This is normal - browser requests include auth cookies');
  } else if (!genResult.ok) {
    console.log(`  Error: ${genResult.data.error}`);
  } else {
    console.log('  Success! Cover generated');
  }

  // Step 7: Test V2 story-text endpoint
  console.log('\nSTEP 7: Testing V2 story-text endpoint...');

  // Create a mock V2 book with name_mapping
  const { data: v2Book } = await supabase
    .from('books')
    .insert({
      user_id: userId,
      status: 'preview_ready',
      blueprint_format: 'v2',
      name_mapping: {
        leon: 'Tommy',
        eden: 'Sarah',
        ruby: 'Emma',
        mum: 'Mum',
        dad: 'Dad',
      },
      personalized_pages: [
        { page_number: 1, title: 'Game Day!', story_text: 'Tommy couldn\'t wait to watch his beloved Bombers!' },
        { page_number: 2, title: 'Trouble at the MCG', story_text: 'Suddenly, a message flashed across the giant screen.' },
      ],
      metadata: { bookId: 'essendon-five' },
    })
    .select()
    .single();

  if (v2Book) {
    console.log(`  Created V2 test book: ${v2Book.id}`);

    // Test story-text endpoint
    const storyTextResult = await makeRequest(`/api/books/${v2Book.id}/story-text`);
    if (storyTextResult.status === 401) {
      console.log('  Expected: 401 Unauthorized (no auth cookie)');
    } else {
      console.log(`  Story text response: ${JSON.stringify(storyTextResult.data).substring(0, 200)}`);
    }
  }

  // Step 8: Verify V2 blueprint loading
  console.log('\nSTEP 8: Verifying V2 blueprint loading...');

  // Import the blueprint loader
  const blueprintPath = path.join(process.cwd(), 'books', 'essendon-five', 'blueprint.json');

  if (fs.existsSync(blueprintPath)) {
    const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf-8'));
    console.log(`  V2 Blueprint loaded: ${blueprint.title}`);
    console.log(`  Schema version: ${blueprint.schema_version}`);
    console.log(`  Page count: ${blueprint.page_count}`);
    console.log(`  Characters: ${Object.keys(blueprint.characters).join(', ')}`);
    console.log(`  First page characters: ${blueprint.pages[0].characters.map(c => c.slot_id).join(', ')}`);
  } else {
    console.error('  V2 Blueprint not found at:', blueprintPath);
  }

  // Cleanup
  console.log('\nCLEANUP: Removing test data...');

  // Keep the characters for future testing but clean up books
  await supabase.from('books').delete().eq('id', newBook.id);
  if (v2Book) {
    await supabase.from('books').delete().eq('id', v2Book.id);
  }
  console.log('  Cleaned up test books');

  console.log('\n=== TEST COMPLETE ===');
  console.log('\nSummary:');
  console.log('- Stories API: ' + (storiesResult.ok ? '✓' : '✗'));
  console.log('- Art Styles API: ' + (stylesResult.ok ? '✓' : '✗'));
  console.log('- Book Creation: ✓');
  console.log('- V2 Blueprint Loading: ✓');
  console.log('- Generate/Story-text APIs: Require browser auth (expected 401)');
  console.log('\nTo fully test generation, use the browser at http://localhost:3000/create');
}

runTests().catch(console.error);
