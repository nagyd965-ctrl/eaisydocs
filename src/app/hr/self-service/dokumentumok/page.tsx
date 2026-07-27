import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { DocumentList } from "@/components/portal/document-list"
import { FileSignature } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function DokumentumokPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Fetch all active documents, and left join with current user's acknowledgement
  const { data: documents, error } = await supabase
    .from("hr_ceges_dokumentum")
    .select(`
      id, cim, leiras, fajl_path, kotelezo_mindenkinek,
      hr_ceges_dokumentum_nyugtazas (id, nyugtazva_mikor)
    `)
    .eq("aktiv", true)
    .eq("hr_ceges_dokumentum_nyugtazas.dolgozo_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Hiba a dokumentumok lekérésekor:", error)
  }

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("nev")
    .eq("id", user.id)
    .single()

  const userName = profile?.nev || "Dolgozó"

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <FileSignature className="w-8 h-8 text-primary" />
          Céges Dokumentumok
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Itt találod a legfontosabb céges szabályzatokat és tájékoztatókat. A piros jelzéssel ellátott dokumentumokat kötelező megismerned és elektronikusan nyugtáznod (elfogadnod).
        </p>
      </div>

      <DocumentList documents={documents || []} userName={userName} />
    </div>
  )
}
