import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: employees } = await supabase.from('hr_dolgozo_adatlap').select('id');
  
  if (employees) {
    for (const emp of employees) {
      await supabase.from('felhasznalo_profil').update({ elerheto_modulok: ['docs', 'hr'] }).eq('id', emp.id);
    }
    console.log("Updated", employees.length, "employees to have both modules.");
  }
}
run();
