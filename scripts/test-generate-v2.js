/**
 * Test V2 book generation with proper authentication
 * Uses Supabase service client to simulate authenticated requests
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

// Test user
const TEST_EMAIL = 'test-v2-generation@example.com';

async function runTest() {
  console.log('=== V2 BOOK GENERATION TEST ===\n');

  // Step 1: Get or create test user
  console.log('STEP 1: Setting up test user...');

  let userId;
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const existingUser = users.find(u => u.email === TEST_EMAIL);

  if (existingUser) {
    userId = existingUser.id;
    console.log(`  Using existing user: ${userId}`);
  } else {
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: 'testpassword123',
      email_confirm: true,
    });
    if (error) {
      console.error('  Failed to create user:', error.message);
      return;
    }
    userId = newUser.user.id;
    console.log(`  Created user: ${userId}`);
  }

  // Ensure profile exists with tokens
  await supabase.from('profiles').upsert({
    id: userId,
    email: TEST_EMAIL,
    tokens: 100,
    tokens_used: 0,
  });

  // Step 2: Create or get characters with generated images
  console.log('\nSTEP 2: Setting up characters...');

  // Check for existing characters
  let { data: existingChars } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', userId)
    .not('generated_image_url', 'is', null);

  if (!existingChars || existingChars.length < 2) {
    console.log('  Need characters with generated images.');
    console.log('  Creating test characters with placeholder images...');

    // Use a real image URL from storage or public URL
    const placeholderImageUrl = 'https://kgnzhfueafnuzjqpcldj.supabase.co/storage/v1/object/public/characters/demo/placeholder.png';

    const testChars = [
      { name: 'Leon Test', character_type: 'person', age: 5 },
      { name: 'Eden Test', character_type: 'person', age: 9 },
      { name: 'Ruby Test', character_type: 'person', age: 7 },
      { name: 'Mum Test', character_type: 'person', age: 35 },
      { name: 'Dad Test', character_type: 'person', age: 38 },
    ];

    for (const char of testChars) {
      const { error } = await supabase.from('characters').insert({
        user_id: userId,
        name: char.name,
        character_type: char.character_type,
        age: char.age,
        original_photo_url: placeholderImageUrl,
        generated_image_url: placeholderImageUrl,
        generation_status: 'completed',
      });
      if (error) {
        console.log(`  Error creating ${char.name}: ${error.message}`);
      } else {
        console.log(`  Created: ${char.name}`);
      }
    }

    // Re-fetch
    const { data: newChars } = await supabase
      .from('characters')
      .select('*')
      .eq('user_id', userId)
      .not('generated_image_url', 'is', null);
    existingChars = newChars;
  }

  console.log(`  Using ${existingChars.length} characters`);
  existingChars.forEach(c => {
    console.log(`    - ${c.name} (age ${c.age})`);
  });

  const characterIds = existingChars.map(c => c.id);

  // Step 3: Create a V2 book
  console.log('\nSTEP 3: Creating V2 book for essendon-five...');

  // Delete any existing draft books
  await supabase
    .from('books')
    .delete()
    .eq('user_id', userId)
    .in('status', ['draft', 'generating']);

  const { data: book, error: bookError } = await supabase
    .from('books')
    .insert({
      user_id: userId,
      status: 'draft',
      blueprint_format: 'v2',
      metadata: {
        bookId: 'essendon-five',
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

  console.log(`  Created book: ${book.id}`);

  // Step 4: Test V2 blueprint loading directly
  console.log('\nSTEP 4: Verifying V2 blueprint...');

  const blueprintPath = path.join(process.cwd(), 'books', 'essendon-five', 'blueprint.json');
  if (!fs.existsSync(blueprintPath)) {
    console.error('  V2 Blueprint not found!');
    return;
  }

  const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf-8'));
  console.log(`  Title: ${blueprint.title}`);
  console.log(`  Format: V2 (schema_version: ${blueprint.schema_version})`);
  console.log(`  Pages: ${blueprint.page_count}`);
  console.log(`  Slots: ${Object.keys(blueprint.characters).join(', ')}`);

  // Step 5: Simulate character assignment
  console.log('\nSTEP 5: Testing V2 character assignment...');

  const page1 = blueprint.pages[0];
  console.log(`  Page 1: "${page1.title}"`);
  console.log(`  Characters on page: ${page1.characters.map(c => c.slot_id).join(', ')}`);
  console.log(`  Absent: ${page1.absent_character_ids.length > 0 ? page1.absent_character_ids.join(', ') : '(none)'}`);

  // Sort by priority
  const sortedChars = [...page1.characters].sort((a, b) => a.priority_rank - b.priority_rank);
  console.log('  Priority order:');
  sortedChars.forEach(c => {
    const charDef = blueprint.characters[c.slot_id];
    const age = charDef?.age || 'adult';
    console.log(`    ${c.priority_rank}. ${c.slot_id} (${age}, ${c.importance}) @ (${c.head_anchor.x.toFixed(2)}, ${c.head_anchor.y.toFixed(2)})`);
  });

  // Match customer characters
  const childSlots = sortedChars.filter(c => blueprint.characters[c.slot_id]?.age < 18);
  const adultSlots = sortedChars.filter(c => !blueprint.characters[c.slot_id]?.age || blueprint.characters[c.slot_id]?.age >= 18);

  const customerChildren = existingChars.filter(c => c.age && c.age < 18);
  const customerAdults = existingChars.filter(c => !c.age || c.age >= 18);

  console.log('\n  Assignment preview:');
  console.log(`    Child slots: ${childSlots.length}, Customer children: ${customerChildren.length}`);
  console.log(`    Adult slots: ${adultSlots.length}, Customer adults: ${customerAdults.length}`);

  // Simulate assignments
  const assignments = [];
  let imageIndex = 2;

  for (let i = 0; i < Math.min(customerChildren.length, childSlots.length); i++) {
    assignments.push({
      slot: childSlots[i].slot_id,
      customer: customerChildren[i].name,
      imageIndex: imageIndex++,
    });
  }

  for (let i = 0; i < Math.min(customerAdults.length, adultSlots.length); i++) {
    assignments.push({
      slot: adultSlots[i].slot_id,
      customer: customerAdults[i].name,
      imageIndex: imageIndex++,
    });
  }

  console.log('\n  Assignments:');
  assignments.forEach(a => {
    console.log(`    IMAGE ${a.imageIndex}: ${a.customer} -> ${a.slot}`);
  });

  // Step 6: Test story text personalization
  console.log('\nSTEP 6: Testing story text personalization...');

  const nameMapping = {};
  assignments.forEach(a => {
    nameMapping[a.slot] = a.customer.replace(' Test', '');
  });
  // Fill in any missing slots with originals
  Object.keys(blueprint.characters).forEach(slot => {
    if (!nameMapping[slot]) {
      nameMapping[slot] = blueprint.characters[slot].name;
    }
  });

  console.log('  Name mapping:', nameMapping);

  const originalText = page1.story_text_template;
  let personalizedText = originalText;
  for (const [slot, name] of Object.entries(nameMapping)) {
    personalizedText = personalizedText.replace(new RegExp(`\\{\\{${slot}\\}\\}`, 'gi'), name);
  }

  console.log(`\n  Original: "${originalText}"`);
  console.log(`  Personalized: "${personalizedText}"`);

  // Step 7: Save test results
  console.log('\nSTEP 7: Updating book with V2 metadata...');

  const personalizedPages = blueprint.pages.map(page => {
    let text = page.story_text_template;
    for (const [slot, name] of Object.entries(nameMapping)) {
      text = text.replace(new RegExp(`\\{\\{${slot}\\}\\}`, 'gi'), name);
    }
    return {
      page_number: page.page_number,
      title: page.title,
      story_text: text,
    };
  });

  const { error: updateError } = await supabase
    .from('books')
    .update({
      name_mapping: nameMapping,
      personalized_pages: personalizedPages,
      blueprint_format: 'v2',
    })
    .eq('id', book.id);

  if (updateError) {
    console.error('  Update failed:', updateError.message);
  } else {
    console.log('  Book updated with V2 metadata');
  }

  // Verify
  const { data: updatedBook } = await supabase
    .from('books')
    .select('*')
    .eq('id', book.id)
    .single();

  console.log('\n  Updated book:');
  console.log(`    ID: ${updatedBook.id}`);
  console.log(`    Format: ${updatedBook.blueprint_format}`);
  console.log(`    Name mapping: ${JSON.stringify(updatedBook.name_mapping)}`);
  console.log(`    Personalized pages: ${updatedBook.personalized_pages?.length || 0} pages`);

  console.log('\n=== V2 GENERATION TEST COMPLETE ===');
  console.log('\nTo generate images, open the browser at:');
  console.log(`  http://localhost:3000/create?book=${book.id}`);
  console.log('\nOr test API directly with:');
  console.log(`  POST /api/books/${book.id}/generate`);
  console.log(`  with body: { "bookId": "essendon-five", "characterIds": ${JSON.stringify(characterIds)} }`);
}

runTest().catch(console.error);
