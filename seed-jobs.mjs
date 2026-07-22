import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
  const { data: jobs } = await supabase.from('hr_munkakor').select('id').limit(1)
  if (!jobs || jobs.length === 0) {
    await supabase.from('hr_munkakor').insert([
      { megnevezes: 'Junior Fejlesztő' },
      { megnevezes: 'Senior Fejlesztő' },
      { megnevezes: 'HR Menedzser' },
      { megnevezes: 'UX/UI Designer' },
      { megnevezes: 'Projektmenedzser' }
    ])
    console.log("Munkakörök hozzáadva!")
  } else {
    console.log("Már vannak munkakörök.")
  }
}

run()
