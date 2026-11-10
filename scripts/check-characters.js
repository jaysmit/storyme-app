// Check character data for debugging
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkChars() {
  const { data, error } = await supabase
    .from('characters')
    .select('id, name, character_type, pet_type, age, generation_status, generated_image_url')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log('=== YOUR CHARACTERS ===\n');
  data.forEach((c, i) => {
    console.log(`${i + 1}. ${c.name} (ID: ${c.id.substring(0, 8)}...)`);
    console.log(`   - character_type: ${c.character_type || 'NULL'}`);
    console.log(`   - pet_type: ${c.pet_type || 'NULL'}`);
    console.log(`   - age: ${c.age ?? 'NULL'}`);
    console.log(`   - generation_status: ${c.generation_status}`);
    console.log(`   - has_image: ${c.generated_image_url ? 'YES' : 'NO'}`);

    // Show what slot type they would map to
    let mappedType = 'other';
    if (c.character_type === 'pet') {
      mappedType = c.pet_type === 'dog' ? 'dog' : 'other';
    } else if (c.character_type === 'person') {
      if (c.age !== null && c.age !== undefined) {
        if (c.age < 2) mappedType = 'baby';
        else if (c.age < 18) mappedType = 'child';
        else mappedType = 'adult';
      } else {
        mappedType = 'child'; // default
      }
    }
    console.log(`   -> MAPS TO SLOT TYPE: ${mappedType}`);
    console.log('');
  });
}

checkChars().catch(console.error);
