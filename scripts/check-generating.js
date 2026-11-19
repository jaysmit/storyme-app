const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: books } = await supabase
    .from('books')
    .select('id, status, page_statuses, updated_at')
    .in('status', ['generating_full', 'cover_approved', 'incomplete'])
    .order('updated_at', { ascending: false })
    .limit(5);

  if (!books || books.length === 0) {
    console.log('No books currently generating');
    return;
  }

  for (const book of books) {
    const statuses = book.page_statuses || [];
    const completed = statuses.filter(p => p.status === 'completed').length;
    const pending = statuses.filter(p => p.status === 'pending').length;
    const generating = statuses.filter(p => p.status === 'generating').length;
    const failed = statuses.filter(p => p.status === 'failed').length;

    console.log('\nBook', book.id, '- Status:', book.status);
    console.log('  Updated:', book.updated_at);
    console.log('  Pages:', statuses.length, '- Completed:', completed, ', Pending:', pending, ', Generating:', generating, ', Failed:', failed);

    // Show any generating pages with their claimedAt times
    const genPages = statuses.filter(p => p.status === 'generating');
    if (genPages.length > 0) {
      genPages.forEach(p => {
        console.log('    Page', p.pageNumber, 'generating since', p.claimedAt || p.startedAt);
      });
    }
  }
}

check();
