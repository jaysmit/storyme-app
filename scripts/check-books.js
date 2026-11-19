const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: books } = await supabase
    .from('books')
    .select('id, status, page_statuses, generation_config, blueprint_format')
    .in('status', ['generating_full', 'incomplete'])
    .limit(5);

  if (!books || books.length === 0) {
    console.log('No books in generating_full or incomplete status');
    return;
  }

  for (const book of books) {
    console.log('\n=== Book', book.id.slice(0,8), '===');
    console.log('Status:', book.status);
    console.log('Blueprint:', book.generation_config?.bookId, '(' + book.blueprint_format + ')');

    const statuses = book.page_statuses || [];
    const completed = statuses.filter(p => p.status === 'completed').length;
    const pending = statuses.filter(p => p.status === 'pending').length;
    const generating = statuses.filter(p => p.status === 'generating').length;
    const failed = statuses.filter(p => p.status === 'failed').length;

    console.log('Pages:', statuses.length, '- Completed:', completed, '- Pending:', pending, '- Generating:', generating, '- Failed:', failed);
    console.log('Page IDs:', statuses.map(p => p.pageId).join(', '));
  }
}

check();
