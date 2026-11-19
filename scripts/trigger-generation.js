const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const bookId = process.argv[2] || 'a6958c3f-5a4e-41b6-8d61-6fe094bb5841';
// Always use production URL for testing
const baseUrl = 'https://storyme-app-roan.vercel.app';
const cronSecret = process.env.CRON_SECRET;

async function trigger() {
  console.log('Triggering generation for book:', bookId);
  console.log('Base URL:', baseUrl);
  console.log('Has CRON_SECRET:', !!cronSecret);

  // Get book info first
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: books, error } = await supabase
    .from('books')
    .select('id, page_statuses')
    .eq('id', bookId);

  console.log('Query result:', { count: books?.length, error: error?.message });
  const book = books?.[0];

  if (!book) {
    console.log('Book not found');
    return;
  }

  const statuses = book.page_statuses || [];
  const pending = statuses.filter(p => p.status === 'pending');
  console.log(`Found ${pending.length} pending pages`);

  if (pending.length === 0) {
    console.log('No pending pages to trigger');
    return;
  }

  // Trigger first 3 pending pages
  const toTrigger = pending.slice(0, 3);

  for (const page of toTrigger) {
    console.log(`Triggering page ${page.pageNumber} (${page.pageId})...`);

    try {
      const res = await fetch(`${baseUrl}/api/books/${bookId}/generate-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: page.pageId,
          fromCron: true,
          internalSecret: cronSecret,
        }),
      });

      const data = await res.json();
      console.log(`  Response (${res.status}):`, data.status || data.error || data.message);
    } catch (err) {
      console.log(`  Error:`, err.message);
    }
  }

  console.log('\nDone! Check Vercel logs for generation progress.');
}

trigger();
