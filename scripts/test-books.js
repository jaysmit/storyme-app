const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kgnzhfueafnuzjqpcldj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnbnpoZnVlYWZudXpqcXBjbGRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzU3NzQwMywiZXhwIjoyMTA5MTUzNDAzfQ.f2_-4Z8uDYNwkf3NptN3fOKWjXK8Wmu5t3wc8OrQ7Bo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBooks() {
  console.log('=== Checking Books ===\n');

  // Get all books
  const { data: books, error } = await supabase
    .from('books')
    .select('id, status, metadata, characters_snapshot, preview_pages, page_statuses, generation_config')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  if (books.length === 0) {
    console.log('No books found');
    return;
  }

  console.log(`Found ${books.length} books:\n`);

  books.forEach((book, i) => {
    const storySlug = book.metadata?.bookId || book.metadata?.storySlug || 'unknown';
    const charCount = book.characters_snapshot?.length || book.metadata?.characterIds?.length || 0;
    const pageCount = book.preview_pages?.length || 0;

    console.log(`${i + 1}. Book ${book.id.substring(0, 8)}...`);
    console.log(`   Status: ${book.status}`);
    console.log(`   Story: ${storySlug}`);
    console.log(`   Characters: ${charCount}`);
    console.log(`   Preview pages: ${pageCount}`);
    console.log(`   Has characters_snapshot: ${book.characters_snapshot ? 'YES' : 'NO'}`);
    console.log(`   Has page_statuses: ${book.page_statuses?.length > 0 ? 'YES (' + book.page_statuses.length + ')' : 'NO'}`);
    console.log(`   Has generation_config: ${book.generation_config ? 'YES' : 'NO'}`);
    console.log('');
  });

  // Find a book that's preview_ready with dragon story
  const dragonBook = books.find(b =>
    (b.metadata?.bookId === 'the-dragon-of-castle-valley' || b.metadata?.storySlug === 'dragon-castle-valley') &&
    b.status === 'preview_ready'
  );

  if (dragonBook) {
    console.log('=== Found Dragon book ready for testing ===');
    console.log('Book ID:', dragonBook.id);
    console.log('Can test: POST /api/books/' + dragonBook.id + '/approve-cover');
  } else {
    console.log('No Dragon book with preview_ready status found.');
    console.log('Create one through the UI to test full generation.');
  }
}

async function checkCharacters() {
  console.log('\n=== Checking Characters ===\n');

  const { data: characters, error } = await supabase
    .from('characters')
    .select('id, name, character_type, pet_type, age, generated_image_url, identity_confirmed')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.log('Error:', error.message);
    return [];
  }

  if (characters.length === 0) {
    console.log('No characters found');
    return [];
  }

  console.log('Found ' + characters.length + ' characters:\n');

  characters.forEach((char, i) => {
    const type = char.character_type || 'person';
    const petInfo = char.pet_type ? ' (' + char.pet_type + ')' : '';
    console.log((i + 1) + '. ' + char.name + ' (' + char.id.substring(0, 8) + '...)');
    console.log('   Type: ' + type + petInfo);
    console.log('   Age: ' + (char.age || 'not set'));
    console.log('   Has illustration: ' + (char.generated_image_url ? 'YES' : 'NO'));
    console.log('   Identity confirmed: ' + (char.identity_confirmed ? 'YES' : 'NO'));
    console.log('');
  });

  const illustrated = characters.filter(c => c.generated_image_url);
  if (illustrated.length > 0) {
    console.log('=== Characters ready for book generation ===');
    illustrated.forEach(c => {
      console.log('- ' + c.name + ' (' + c.id + ')');
    });
  }

  return illustrated;
}

async function createDragonBook(characterIds) {
  console.log('\n=== Creating Dragon Book for Testing ===\n');

  // Get user ID from first character
  const { data: char } = await supabase
    .from('characters')
    .select('user_id')
    .eq('id', characterIds[0])
    .single();

  if (!char) {
    console.log('Could not find character owner');
    return null;
  }

  // Create book
  const { data: book, error } = await supabase
    .from('books')
    .insert({
      user_id: char.user_id,
      status: 'draft',
      metadata: {
        bookId: 'the-dragon-of-castle-valley',
        storySlug: 'the-dragon-of-castle-valley',
        artStyle: 'storybook-classic',
        characterIds: characterIds
      }
    })
    .select()
    .single();

  if (error) {
    console.log('Error creating book:', error.message);
    return null;
  }

  console.log('Created book:', book.id);
  console.log('Now generate cover via API: POST /api/books/' + book.id + '/generate');
  return book;
}

async function testApproveCover(bookId) {
  console.log('\n=== Testing Approve Cover API ===\n');
  console.log('Book ID:', bookId);

  const response = await fetch('https://storyme-app-roan.vercel.app/api/books/' + bookId + '/approve-cover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  const data = await response.json();
  console.log('Response status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));
  return data;
}

async function testStartGeneration(bookId) {
  console.log('\n=== Testing Start Full Generation API ===\n');
  console.log('Book ID:', bookId);

  const response = await fetch('https://storyme-app-roan.vercel.app/api/books/' + bookId + '/start-full-generation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  const data = await response.json();
  console.log('Response status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));
  return data;
}

async function approveCoverDirect(bookId) {
  console.log('\n=== Approving Cover (Direct DB) ===\n');
  console.log('Book ID:', bookId);

  const { error } = await supabase
    .from('books')
    .update({ status: 'cover_approved' })
    .eq('id', bookId);

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('Book status updated to cover_approved');
  console.log('Next: node test-books.js init-pages', bookId);
}

async function initPageStatuses(bookId) {
  console.log('\n=== Initializing Page Statuses ===\n');
  console.log('Book ID:', bookId);

  // Get book metadata
  const { data: book } = await supabase
    .from('books')
    .select('metadata, characters_snapshot')
    .eq('id', bookId)
    .single();

  if (!book) {
    console.log('Book not found');
    return;
  }

  const storySlug = book.metadata?.bookId || book.metadata?.storySlug;
  console.log('Story:', storySlug);

  // Read blueprint to get pages
  const fs = require('fs');
  const path = require('path');
  const blueprintPath = path.join(__dirname, '..', 'book-blueprints', storySlug + '.json');

  if (!fs.existsSync(blueprintPath)) {
    console.log('Blueprint not found:', blueprintPath);
    return;
  }

  const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
  const interiorPages = blueprint.pages.filter(p => p.pageType === 'interior' && p.originalImage);

  console.log('Found', interiorPages.length, 'interior pages');

  if (interiorPages.length === 0) {
    console.log('No interior pages in blueprint');
    return;
  }

  const pageStatuses = interiorPages.map(p => ({
    pageId: p.pageId,
    pageNumber: p.pageNumber,
    status: 'pending',
    retryCount: 0
  }));

  const generationConfig = {
    storySlug: storySlug,
    artStyle: book.metadata?.artStyle || 'storybook-classic',
    characterIds: book.metadata?.characterIds || []
  };

  const { error } = await supabase
    .from('books')
    .update({
      status: 'generating_full',
      page_statuses: pageStatuses,
      generation_config: generationConfig
    })
    .eq('id', bookId);

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('Page statuses initialized:', pageStatuses.length, 'pages');
  console.log(JSON.stringify(pageStatuses, null, 2));
  console.log('\nReady for page generation!');
}

async function simulateCover(bookId) {
  console.log('\n=== Simulating Cover Generation ===\n');
  console.log('Book ID:', bookId);

  // Get the characters for snapshot
  const { data: book } = await supabase
    .from('books')
    .select('metadata')
    .eq('id', bookId)
    .single();

  if (!book) {
    console.log('Book not found');
    return;
  }

  const characterIds = book.metadata?.characterIds || [];
  const { data: characters } = await supabase
    .from('characters')
    .select('id, name, character_type, pet_type, age, generated_image_url, identity_profile, identity_confirmed')
    .in('id', characterIds);

  const charactersSnapshot = (characters || []).map(c => ({
    id: c.id,
    name: c.name,
    character_type: c.character_type,
    pet_type: c.pet_type,
    age: c.age,
    generated_image_url: c.generated_image_url,
    identity_profile: c.identity_profile,
    identity_confirmed: c.identity_confirmed
  }));

  // Use a placeholder cover image
  const placeholderCover = 'https://kgnzhfueafnuzjqpcldj.supabase.co/storage/v1/object/public/book-covers/the-dragon-of-castle-valley.jpg';

  const { error } = await supabase
    .from('books')
    .update({
      status: 'preview_ready',
      preview_pages: [{ page_number: 0, url: placeholderCover, title: 'Cover' }],
      characters_snapshot: charactersSnapshot
    })
    .eq('id', bookId);

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('Book updated to preview_ready with cover');
  console.log('Characters snapshot:', charactersSnapshot.length, 'characters');
  console.log('Next: node test-books.js approve', bookId);
}

async function main() {
  const command = process.argv[2];

  if (command === 'simulate-cover') {
    const bookId = process.argv[3];
    if (bookId) {
      await simulateCover(bookId);
    } else {
      console.log('Usage: node test-books.js simulate-cover <book-id>');
    }
  } else if (command === 'create-dragon') {
    const chars = await checkCharacters();
    if (chars.length >= 2) {
      await createDragonBook([chars[0].id, chars[1].id]);
    } else {
      console.log('Need at least 2 illustrated characters');
    }
  } else if (command === 'approve-direct') {
    const bookId = process.argv[3];
    if (bookId) {
      await approveCoverDirect(bookId);
    } else {
      console.log('Usage: node test-books.js approve-direct <book-id>');
    }
  } else if (command === 'init-pages') {
    const bookId = process.argv[3];
    if (bookId) {
      await initPageStatuses(bookId);
    } else {
      console.log('Usage: node test-books.js init-pages <book-id>');
    }
  } else if (command === 'approve') {
    const bookId = process.argv[3];
    if (bookId) {
      await testApproveCover(bookId);
    } else {
      console.log('Usage: node test-books.js approve <book-id>');
    }
  } else if (command === 'start') {
    const bookId = process.argv[3];
    if (bookId) {
      await testStartGeneration(bookId);
    } else {
      console.log('Usage: node test-books.js start <book-id>');
    }
  } else {
    await checkBooks();
    await checkCharacters();
    console.log('\n=== Commands ===');
    console.log('node test-books.js create-dragon  - Create a Dragon book with first 2 characters');
    console.log('node test-books.js approve <id>   - Approve cover for book');
    console.log('node test-books.js start <id>     - Start full generation');
  }
}

main().catch(console.error);
