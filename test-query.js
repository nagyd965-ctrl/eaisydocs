const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data: allEmployees, error } = await supabase
    .from("hr_dolgozo_adatlap")
    .select(`
      id, 
      felhasznalo_profil!inner(nev), 
      hr_munkakor(megnevezes)
    `)
    .order("created_at", { ascending: true })
  console.log("Employees:", allEmployees);
  console.log("Error:", error);
}
test();
