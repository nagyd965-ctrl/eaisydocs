import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // use service role for deletion to bypass RLS
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Törlés indítása...");
  
  // Find test emails (subject starts with 'teszt')
  const { data, error } = await supabase
    .from('irat')
    .select('id, targy, erkeztetoszam')
    .eq('erkezes_modja', 'email')
    .ilike('targy', 'teszt%');

  if (error) {
    console.error("Hiba a lekérdezésnél:", error);
    return;
  }

  if (!data || data.length === 0) {
    console.log("Nincs törlendő teszt levél.");
    return;
  }

  console.log(`Találtunk ${data.length} teszt levelet, törlés folyamatban...`);

  for (const irat of data) {
    console.log(`- Törlés: ${irat.erkeztetoszam || '-'} (${irat.targy})`);
    
    // First delete from irat_fajl to be safe (though ON DELETE CASCADE should handle it)
    await supabase.from('irat_fajl').delete().eq('irat_id', irat.id);
    
    // Then delete irat
    const { error: delError } = await supabase.from('irat').delete().eq('id', irat.id);
    if (delError) {
      console.error("Hiba a törlésnél:", delError);
    }
  }

  console.log("Törlés befejeződött!");
}

run();
