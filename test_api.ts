import * as fs from 'fs'

async function test() {
    console.log("Fetching API...")
    // Fetch directly from localhost:3000 where the Next.js dev server is running
    // We need to pass the auth cookie, but wait, the dev server is running locally for the user.
    // I'll just do a fetch without auth, which should return 401.
    const res = await fetch("http://localhost:3000/api/pdf/0e58f848-4ece-4754-913f-2cc0777fb249")
    console.log("Status:", res.status)
    const text = await res.text()
    console.log("Response:", text.substring(0, 100))
}

test().catch(console.error)
