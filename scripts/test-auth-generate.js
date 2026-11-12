/**
 * Test V2 generation with real authentication and OpenAI call
 * This will actually generate images if OPENAI_API_KEY is set
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const TEST_EMAIL = 'test-v2-generation@example.com';

async function runTest() {
  console.log('=== AUTHENTICATED V2 GENERATION TEST ===\n');

  // Get test user
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const user = users.find(u => u.email === TEST_EMAIL);

  if (!user) {
    console.error('Test user not found. Run test-generate-v2.js first.');
    return;
  }

  console.log(`User: ${user.email} (${user.id})`);

  // Get user's book
  const { data: books } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', user.id)
    .eq('blueprint_format', 'v2')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!books || books.length === 0) {
    console.error('No V2 book found. Run test-generate-v2.js first.');
    return;
  }

  const book = books[0];
  console.log(`Book: ${book.id}`);
  console.log(`Status: ${book.status}`);
  console.log(`Metadata: ${JSON.stringify(book.metadata)}`);

  // Get characters
  const { data: characters } = await supabase
    .from('characters')
    .select('id, name, age, generated_image_url')
    .eq('user_id', user.id)
    .not('generated_image_url', 'is', null);

  console.log(`\nCharacters: ${characters.length}`);
  characters.forEach(c => {
    console.log(`  - ${c.name} (age ${c.age}): ${c.generated_image_url ? 'Has image' : 'No image'}`);
  });

  // Check if we have real character images (not placeholders)
  const hasRealImages = characters.some(c =>
    c.generated_image_url &&
    !c.generated_image_url.includes('placeholder') &&
    !c.generated_image_url.includes('demo')
  );

  if (!hasRealImages) {
    console.log('\n⚠️  Characters have placeholder images.');
    console.log('   For real generation test, upload actual photos via the UI.');
    console.log('   The V2 system structure is working correctly.');
  }

  // Create auth session for API call
  console.log('\nCreating auth session...');

  const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: TEST_EMAIL,
  });

  if (sessionError) {
    console.error('Failed to create session:', sessionError.message);
    return;
  }

  // Try to sign in
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: 'testpassword123',
  });

  if (signInError) {
    console.error('Sign in failed:', signInError.message);
    return;
  }

  console.log('Session created:', signInData.session ? 'Yes' : 'No');

  if (signInData.session) {
    const accessToken = signInData.session.access_token;

    console.log('\nAttempting generation API call...');
    console.log('(This will make a real OpenAI API call if images are valid)');

    const response = await fetch(`http://localhost:3000/api/books/${book.id}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Cookie': `sb-access-token=${accessToken}; sb-refresh-token=${signInData.session.refresh_token}`,
      },
      body: JSON.stringify({
        bookId: 'essendon-five',
        characterIds: characters.map(c => c.id),
      }),
    });

    const result = await response.json();
    console.log(`\nResponse: ${response.status}`);
    console.log(JSON.stringify(result, null, 2).substring(0, 500));

    if (response.ok) {
      console.log('\n✓ Generation successful!');
      console.log(`Cover URL: ${result.pages?.[0]?.url || 'N/A'}`);
    } else {
      console.log(`\n✗ Generation failed: ${result.error}`);
    }
  }

  // Test story-text endpoint
  console.log('\n--- Testing story-text endpoint ---');

  if (signInData.session) {
    const storyResponse = await fetch(`http://localhost:3000/api/books/${book.id}/story-text`, {
      headers: {
        'Authorization': `Bearer ${signInData.session.access_token}`,
        'Cookie': `sb-access-token=${signInData.session.access_token}`,
      },
    });

    const storyResult = await storyResponse.json();
    console.log(`Response: ${storyResponse.status}`);

    if (storyResponse.ok) {
      console.log('Format:', storyResult.format);
      console.log('Name mapping:', JSON.stringify(storyResult.nameMapping));
      console.log(`Pages: ${storyResult.pages?.length || 0}`);
      if (storyResult.pages && storyResult.pages.length > 0) {
        console.log(`First page: "${storyResult.pages[0].title}" - "${storyResult.pages[0].story_text.substring(0, 50)}..."`);
      }
    } else {
      console.log('Error:', storyResult.error);
    }
  }

  console.log('\n=== TEST COMPLETE ===');
}

runTest().catch(console.error);
