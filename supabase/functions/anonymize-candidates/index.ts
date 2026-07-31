import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

    // Határidő kiszámítása (6 hónap)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const sixMonthsAgoISO = sixMonthsAgo.toISOString()

    // Keressük meg a 6 hónapnál régebbi, még nem anonimizált jelölteket
    const { data: candidates, error: fetchError } = await supabaseAdmin
      .from("hr_toborzas")
      .select("id, cv_storage_path")
      .lt("created_at", sixMonthsAgoISO)
      .neq("statusz", "Anonimizálva")

    if (fetchError) {
      throw fetchError
    }

    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ message: "Nincs anonimizálásra váró jelentkező." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      })
    }

    let processedCount = 0

    // Fájlok és adatok törlése
    for (const candidate of candidates) {
      if (candidate.cv_storage_path) {
        const { error: storageError } = await supabaseAdmin.storage
          .from("hr-documents")
          .remove([candidate.cv_storage_path])
        
        if (storageError) {
          console.error(`Hiba a CV törlésekor (ID: ${candidate.id}):`, storageError)
        }
      }

      const { error: updateError } = await supabaseAdmin
        .from("hr_toborzas")
        .update({
          nev: "Anonimizált Jelölt",
          email: null,
          telefon: null,
          uzenet: null,
          naptar_jegyzet: null,
          cv_storage_path: null,
          statusz: "Anonimizálva"
        })
        .eq("id", candidate.id)

      if (updateError) {
        console.error(`Hiba a jelentkező anonimizálásakor (ID: ${candidate.id}):`, updateError)
      } else {
        processedCount++
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: `Anonimizálás befejezve. Feldolgozva: ${processedCount} / ${candidates.length} jelentkező.`
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error: any) {
    console.error("Anonimizációs cron hiba:", error)
    return new Response(JSON.stringify({ error: error.message || "Belső szerverhiba" }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
})
