import { createClient } from "@supabase/supabase-js"
import * as fs from 'fs'
import * as path from 'path'

const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8')
const env: Record<string, string> = {}
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) env[match[1]] = match[2]
})

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
)

async function check() {
    const { data, error } = await supabase
        .from('irat')
        .select('id, targy, minosites, erkeztetoszam')
        .order('created_at', { ascending: false })
        .limit(3)
        
    console.log(data, error)
}

check().catch(console.error)
