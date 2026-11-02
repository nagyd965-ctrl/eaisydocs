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

  let cafeteriaQuery = supabase
    .from("hr_cafeteria_keret")
    .select("*")
    .eq("dolgozo_id", user.id)
    .eq("nyilatkozat_lezarva", true)
    .order("ev", { ascending: false })

  if (activeCompanyId) {
    cafeteriaQuery = cafeteriaQuery.eq("company_id", activeCompanyId)
  }

  const [{ data: documents, error }, { data: profile }, { data: closedCafeterias }] = await Promise.all([
    docsQuery,
    supabase.from("felhasznalo_profil").select("nev").eq("id", user.id).maybeSingle(),
    cafeteriaQuery,
  ])

  if (error) {
    console.error("Hiba a dolgozói dokumentumok lekérésekor:", error)
  }

  const employeeName = profile?.nev || "Munkavállaló"

  // Kötegelt aláírt URL-ek generálása a letöltéshez és közvetlen megjelenítéshez
  const pathsToSign = new Set<string>()
  for (const doc of documents || []) {
    if (doc.url && !doc.url.startsWith("http") && !doc.url.startsWith("/api/")) pathsToSign.add(doc.url)
    if (doc.alairt_fajl_url && !doc.alairt_fajl_url.startsWith("http") && !doc.alairt_fajl_url.startsWith("/api/")) {
      pathsToSign.add(doc.alairt_fajl_url)
    }
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

  const hrDocuments: HrDocument[] = (documents || []).map((doc) => {
    const signedUrl = doc.url
      ? doc.url.startsWith("http") || doc.url.startsWith("/api/")
        ? doc.url
        : signedUrlMap.get(doc.url) || doc.url
      : null
    const alairtSignedUrl = doc.alairt_fajl_url
      ? doc.alairt_fajl_url.startsWith("http") || doc.alairt_fajl_url.startsWith("/api/")
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

  // Leadott Cafeteria nyilatkozatok beemelése a Dokumentumaim listába, ha még nincs külön hr_dokumentum rekordjuk
  const existingDocIds = new Set(hrDocuments.map((d) => d.id))
  for (const keret of closedCafeterias || []) {
    const alreadyInDocs =
      (keret.dokumentum_id && existingDocIds.has(keret.dokumentum_id)) ||
      hrDocuments.some(
        (d) =>
          d.kategoria === "Cafeteria / Béren kívüli juttatások" &&
          d.nev?.includes(`(${keret.ev})`)
      )

    if (!alreadyInDocs) {
      const previewApiUrl = `/api/hr/cafeteria-pdf?employeeId=${user.id}&year=${keret.ev}&preview=true`
      const downloadApiUrl = `/api/hr/cafeteria-pdf?employeeId=${user.id}&year=${keret.ev}`
      hrDocuments.push({
        id: `cafeteria-${keret.ev}`,
        dolgozo_id: user.id,
        nev: `${employeeName} - Cafeteria Nyilatkozat (${keret.ev})`,
        kategoria: "Cafeteria / Béren kívüli juttatások",
        url: previewApiUrl,
        displayUrl: previewApiUrl,
        signedUrl: downloadApiUrl,
        created_at: keret.lezaras_datuma || keret.created_at || new Date().toISOString(),
        iktatoszam: keret.iktatoszam || null,
        ugyirat_id: keret.ugyirat_id || null,
        irat_id: keret.irat_id || null,
        alairas_statusz: "alairva",
        alairva_ekor: keret.lezaras_datuma || null,
        company_id: keret.company_id || activeCompanyId || null,
      })
    }
  }

  hrDocuments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

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
