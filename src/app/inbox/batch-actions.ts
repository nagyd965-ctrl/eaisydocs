"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { splitBatchPdf, ingestSplitDocuments } from "@/utils/batch-scanner"
import { processHotfolderFiles } from "@/utils/scanner-hotfolder"

export async function uploadAndSplitBatch(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nincs bejelentkezve." }

  // Jogosultság ellenőrzése
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("docs_szerepkor")
    .eq("id", user.id)
    .single()

  const userRole = profile?.docs_szerepkor || "ugyintezo"
  const isAllowed = ["admin", "rendszergazda", "iktato"].includes(userRole)
  if (!isAllowed) {
    return { success: false, error: "Nincs jogosultságod kötegelt iratok érkeztetéséhez." }
  }

  const file = formData.get("file") as File | null
  const targyPrefix = (formData.get("targy_prefix") as string)?.trim() || ""
  const kuldoNev = (formData.get("kuldo_nev") as string)?.trim() || ""
  const kuldoTipus = (formData.get("kuldo_tipus") as string)?.trim() || "ceg"
  const minosites = (formData.get("minosites") as string) || "nyilt"

  if (!file || file.size === 0) {
    return { success: false, error: "Kérjük, válasszon ki egy PDF fájlt!" }
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return { success: false, error: "Kizárólag PDF formátumú köteg tölthető fel!" }
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 1. Partner feloldása vagy létrehozása, ha meg van adva
    let partnerId: string | null = null
    if (kuldoNev) {
      const { findOrCreatePartner } = await import("@/utils/partner-matcher")
      try {
        const partnerResult = await findOrCreatePartner(supabase, {
          nev: kuldoNev,
          tipus: kuldoTipus,
        })
        partnerId = partnerResult.id
      } catch (err) {
        console.warn("[BatchActions] Partner creation warning:", err)
      }
    }

    // 2. Kötegelt PDF szétbontása az elválasztólapok mentén
    const splitResult = await splitBatchPdf(buffer)

    if (splitResult.documents.length === 0) {
      return {
        success: false,
        error: "A feltöltött fájl nem tartalmaz feldolgozható tartalmi oldalt.",
      }
    }

    // 3. Dokumentumok érkeztetése
    const ingested = await ingestSplitDocuments(
      splitResult.documents,
      {
        targyPrefix: targyPrefix || `Szkennelt köteg: ${file.name.replace(/\.pdf$/i, "")}`,
        kuldoNev,
        kuldoTipus,
        partnerId,
        minosites,
        felhasznaloId: user.id,
      },
      supabase
    )

    revalidatePath("/inbox")

    return {
      success: true,
      totalOriginalPages: splitResult.totalOriginalPages,
      separatorPagesFound: splitResult.separatorPagesFound,
      count: ingested.length,
      documents: ingested,
    }
  } catch (err: any) {
    console.error("[BatchActions] Error splitting and ingesting batch:", err)
    return {
      success: false,
      error: "Hiba történt a köteg szétbontása és érkeztetése során: " + err.message,
    }
  }
}

export async function triggerHotfolderSync() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nincs bejelentkezve." }

  try {
    const report = await processHotfolderFiles(supabase)
    revalidatePath("/inbox")
    return { success: true, report }
  } catch (err: any) {
    console.error("[BatchActions] Error syncing hotfolder:", err)
    return { success: false, error: err.message }
  }
}
