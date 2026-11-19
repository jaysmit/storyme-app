const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixBook() {
  const bookId = 'e7929c6c-299d-409e-a07c-aa8a0407c7b1';

  // Get the book
  const { data: book, error } = await supabase
    .from('books')
    .select('id, status, page_statuses, generation_config, blueprint_format')
    .eq('id', bookId)
    .single();

  if (error || !book) {
    console.log('Book not found');
    return;
  }

  console.log('=== Before Fix ===');
  console.log('Status:', book.status);

  const statuses = book.page_statuses || [];
  const completed = statuses.filter(p => p.status === 'completed').length;
  const pending = statuses.filter(p => p.status === 'pending').length;
  const generating = statuses.filter(p => p.status === 'generating').length;
  const failed = statuses.filter(p => p.status === 'failed').length;

  console.log('Pages:', statuses.length, '- Completed:', completed, '- Pending:', pending, '- Generating:', generating, '- Failed:', failed);

  // If all pages are complete, update status to completed
  if (completed === statuses.length && pending === 0 && generating === 0 && failed === 0) {
    console.log('\nAll pages complete! Updating status to "completed"...');

    const { error: updateError } = await supabase
      .from('books')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookId);

    if (updateError) {
      console.log('Error updating:', updateError.message);
    } else {
      console.log('✓ Book status updated to "completed"');
    }
  } else {
    console.log('\nBook is not fully complete, cannot auto-fix');
  }
}

fixBook();
