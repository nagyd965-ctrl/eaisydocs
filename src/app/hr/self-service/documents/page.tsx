import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { EmployeeDocumentsView, HrDocument } from "@/components/hr/employee-documents-view"
import { getActiveCompanyIdServer } from "@/utils/company-server"

export default async function EmployeeDocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const activeCompanyId = await getActiveCompanyIdServer()

  let docsQuery = supabase
    .from("hr_dokumentum")
    .select("*")
    .eq("dolgozo_id", user.id)
    .order("created_at", { ascending: false })

  if (activeCompanyId) {
    docsQuery = docsQuery.or(`company_id.eq.${activeCompanyId},company_id.is.null`)
  }

  const [{ data: documents, error }, { data: profile }] = await Promise.all([
    docsQuery,
    supabase.from("felhasznalo_profil").select("nev").eq("id", user.id).maybeSingle(),
  ])

  if (error) {
    console.error("Hiba a dolgozói dokumentumok lekérésekor:", error)
  }

  // Kötegelt aláírt URL-ek generálása a letöltéshez és közvetlen megjelenítéshez
  const pathsToSign = new Set<string>()
  for (const doc of documents || []) {
    if (doc.url && !doc.url.startsWith("http")) pathsToSign.add(doc.url)
    if (doc.alairt_fajl_url && !doc.alairt_fajl_url.startsWith("http")) pathsToSign.add(doc.alairt_fajl_url)
  }

  const signedUrlMap = new Map<string, string>()
  if (pathsToSign.size > 0) {
    const { data: signedList } = await supabase.storage
      .from("irat_files")
      .createSignedUrls(Array.from(pathsToSign), 3600)
    for (const item of signedList || []) {
      if (item.path && item.signedUrl) {
        signedUrlMap.set(item.path, item.signedUrl)
      }
    }
  }

  const hrDocuments = (documents || []).map((doc) => {
    const signedUrl = doc.url
      ? doc.url.startsWith("http")
        ? doc.url
        : signedUrlMap.get(doc.url) || doc.url
      : null
    const alairtSignedUrl = doc.alairt_fajl_url
      ? doc.alairt_fajl_url.startsWith("http")
        ? doc.alairt_fajl_url
        : signedUrlMap.get(doc.alairt_fajl_url) || doc.alairt_fajl_url
      : null

    return {
      ...doc,
      signedUrl,
      alairtSignedUrl,
      displayUrl: alairtSignedUrl || signedUrl,
    }
  })

  return (
    <div className="space-y-6 pb-12">
      {/* Fejléc */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dokumentumaim</h1>
        <p className="text-muted-foreground mt-1">
          Hivatalos munkaviszony-iratok, szerződések, jegyzőkönyvek és hatósági igazolások.
        </p>
      </div>

      {/* Részletes dokumentum lista szűrőkkel és előnézettel */}
      <EmployeeDocumentsView
        documents={(hrDocuments as HrDocument[]) || []}
        employeeId={user.id}
        employeeName={profile?.nev || "Munkavállaló"}
      />
    </div>
  )
}
