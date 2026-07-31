import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { NavT1041Generator } from "@/components/hr/nav-t1041-generator"
import { KshReportGenerator } from "@/components/hr/ksh-report-generator"

export default async function CompliancePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select('hr_szerepkor')
    .eq("id", user.id)
    .single()

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin"].includes(profile.hr_szerepkor)) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-center">
        <div>
          <h2 className="text-2xl font-bold text-destructive mb-2">Hozzáférés Megtagadva</h2>
          <p className="text-muted-foreground">Ehhez a modulhoz HR jogosultság szükséges.</p>
        </div>
      </div>
    )
  }

  const { data: rawEmployees } = await supabase
    .from("hr_jogviszony")
    .select(`
      id,
      belepes_datuma,
      dolgozo_id,
      hr_dolgozo_adatlap (
        id,
        felhasznalo_profil ( nev )
      ),
      hr_beosztas (
        munkaido_fte,
        hr_munkakor ( megnevezes, feor_kod )
      )
    `)
    .order("created_at", { ascending: false })

  const { data: secretData } = await supabase
    .from("hr_dolgozo_titkos_adat")
    .select("*")
    
  const hexToAscii = (hex: string | null) => {
    if (!hex || !hex.startsWith('\\x')) return null;
    const h = hex.substring(2);
    let str = '';
    for (let i = 0; i < h.length; i += 2) {
      str += String.fromCharCode(parseInt(h.substr(i, 2), 16));
    }
    return str;
  }

  const employees = (rawEmployees || []).map((j: any) => {
    const secrets = secretData?.find(s => s.dolgozo_id === j.dolgozo_id);
    return {
      id: j.id,
      hr_jogviszony: [{ belepes_datuma: j.belepes_datuma }],
      felhasznalo_profil: j.hr_dolgozo_adatlap?.felhasznalo_profil,
      munkaido_fte: j.hr_beosztas?.[0]?.munkaido_fte,
      hr_munkakor: {
        megnevezes: j.hr_beosztas?.[0]?.hr_munkakor?.megnevezes,
        feor: j.hr_beosztas?.[0]?.hr_munkakor?.feor_kod
      },
      taj_szam: secrets ? hexToAscii(secrets.taj_szam_titkositott) : null,
      adoazonosito_jel: secrets ? hexToAscii(secrets.adoazonosito_titkositott) : null
    }
  })

  return (
    <div className="space-y-8 pb-10">
      <div className="print:hidden">
        <h1 className="text-3xl font-semibold tracking-tight">Hatósági Adatszolgáltatás</h1>
        <p className="text-muted-foreground mt-1">
          Törvényi kötelezettségek, NAV bejelentések és KSH statisztikák kezelése.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* NAV T1041 Generátor */}
        <section>
          <NavT1041Generator employees={employees || []} />
        </section>

        {/* KSH Munkaügyi Jelentés */}
        <section className="print:hidden">
          <KshReportGenerator employees={employees || []} />
        </section>
      </div>
    </div>
  )
}
