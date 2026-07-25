import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDocuments() {
  console.log("Checking hr_dokumentum table...")
  const { data: dbData, error: dbError } = await supabase
    .from('hr_dokumentum')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (dbError) {
    console.error("DB Error:", dbError)
  } else {
    console.log("Recent documents in DB:", dbData)
  }

  console.log("\nChecking storage bucket 'irat_files'...")
  // Note: List API might be restricted by RLS on storage, but we are using service_role if available.
  // Actually let's just use anon key if service role is missing, might fail.
  // We can at least check if the path exists by trying to create a signed URL if we know the path.
  if (dbData && dbData.length > 0) {
    const firstDoc = dbData[0]
    if (firstDoc.url) {
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage.from('irat_files').createSignedUrl(firstDoc.url, 60)
        if (signedUrlError) {
            console.error("Storage Error on Signed URL:", signedUrlError)
        } else {
            console.log("Successfully generated signed URL for the latest file, meaning it exists in Storage!")
            console.log("Signed URL:", signedUrlData?.signedUrl)
        }
    }
  }
}

checkDocuments()
