import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  const { data, error } = await supabase
    .from("feladat")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(3)

  console.log("FELADAT DATA:", JSON.stringify(data, null, 2))
  console.log("FELADAT ERROR:", error)

  const { data: logs } = await supabase
    .from("esemeny_naplo")
    .select("*")
    .eq("entitas_tipus", "ugyirat")
    .order("tortent", { ascending: false })
    .limit(3)

  console.log("LOGS DATA:", JSON.stringify(logs, null, 2))
}

main()
