import { createClient } from "@/utils/supabase/server"
import { getPermissions } from "@/utils/permissions"
import { DossiersTableClient } from "./dossiers-table-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function DossiersPage() {
  const supabase = await createClient()

  const query = supabase
    .from("ugyirat")
    .select(`
      id,
      iktatoszam,
      statusz,
      iktatas_datuma,
      megorzesi_ido_vege,
      szervezeti_egyseg_id,
      ugy!inner ( id, targy, hatarido, statusz, felelos_user_id ),
      irat ( id, minosites )
    `)
    .order("iktatas_datuma", { ascending: false })
    .limit(200)

  const { data: rawDossiers } = await query
  const dossiers = rawDossiers || []

  // Current user role check
  const { data: authUser } = await supabase.auth.getUser()
  const { data: currentUserProfile } = await supabase
    .from("felhasznalo_profil")
    .select("docs_szerepkor, szervezeti_egyseg_id")
    .eq("id", authUser?.user?.id || "")
    .single()

  const permissions = getPermissions(currentUserProfile?.docs_szerepkor)
  const canAssign = permissions.canAssign

  // Felhasználók és szervezeti egységek lekérése memóriába
  const { data: users } = await supabase
    .from("felhasznalo_profil")
    .select("id, nev, docs_szerepkor, szervezeti_egyseg_id")

  const { data: depts } = await supabase
    .from("szervezeti_egyseg")
    .select("id, nev")

  const userMap = (users || []).reduce((acc: any, user: any) => {
    acc[user.id] = user.nev
    return acc
  }, {})

  const deptMap = (depts || []).reduce((acc: any, dept: any) => {
    acc[dept.id] = dept.nev
    return acc
  }, {})

  // Map dossiers to include user name and department name
  const mappedDossiers = (dossiers || []).map((d: any) => {
    const ugy = d.ugy as any
    if (ugy && ugy.felelos_user_id) {
      ugy.felelos_user = {
        id: ugy.felelos_user_id,
        full_name: userMap[ugy.felelos_user_id],
      }
    }
    if (d.szervezeti_egyseg_id) {
      d.szervezeti_egyseg = {
        nev: deptMap[d.szervezeti_egyseg_id] || "Egyéb",
      }
    }
    return d
  })

  return (
    <div className="page-animate space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Iktatókönyv</h1>
        <p className="text-muted-foreground">Az összes iktatott ügyirat nyilvántartása.</p>
      </div>

      <DossiersTableClient
        initialDossiers={mappedDossiers}
        users={users || []}
        currentUserProfile={currentUserProfile}
        canAssign={canAssign}
      />
    </div>
  )
}
