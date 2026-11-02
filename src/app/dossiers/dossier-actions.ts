"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { sendNotificationEmail, buildHtmlEmail } from "@/utils/mailer"
import { getBaseUrl } from "@/utils/url"
import { requireDocsAuthServer } from "@/utils/docs-auth-guard"

export async function assignDossier(formData: FormData) {
  const ugy_id = formData.get("ugy_id") as string
  const felelos_user_id = formData.get("felelos_user_id") as string
  const hatarido = formData.get("hatarido") as string
  const ugyirat_id = formData.get("ugyirat_id") as string

  if (!ugy_id) return { error: "Hiányzó ügy azonosító" }

  const supabase = await createClient()

  const { data: ugyiratTarget } = await supabase
    .from("ugyirat")
    .select("id, company_id, szervezeti_egyseg_id, statusz")
    .eq("id", ugyirat_id)
    .maybeSingle()

  const auth = await requireDocsAuthServer(
    ["admin", "rendszergazda", "iktato", "vezeto"],
    ugyiratTarget?.company_id || null
  )
  if (!auth.authorized || !auth.user) {
    return { error: auth.error || "Nincs jogosultságod az ügyirat kiosztásához/szignálásához." }
  }

  const user = auth.user
  const userRole = auth.docsRole || "ugyintezo"

  if (userRole === "vezeto") {
    const { data: explicitAccess } = await supabase
      .from("ugyirat_hozzaferes")
      .select("id")
      .eq("ugyirat_id", ugyirat_id)
      .eq("user_id", user.id)
      .maybeSingle()

    const hasExplicit = !!explicitAccess
    const inDept = ugyiratTarget?.szervezeti_egyseg_id === auth.szervezetiEgysegId

    if (!inDept && !hasExplicit) {
      return { error: "Vezetőként csak a saját osztályodhoz tartozó ügyiratokat oszthatod ki." }
    }
  }

  // 1. Update the ugy table
  const updateData: any = {}
  if (felelos_user_id) {
    updateData.felelos_user_id = felelos_user_id === "none" ? null : felelos_user_id
  }
  if (hatarido) {
    updateData.hatarido = hatarido
  } else if (hatarido === "") {
    updateData.hatarido = null
  }

  const { error: ugyError } = await supabase
    .from("ugy")
    .update(updateData)
    .eq("id", ugy_id)

  if (ugyError) {
    return { error: "Hiba a felelős beállításakor: " + ugyError.message }
  }

  // 2. Also update ugyirat statusz to szignalt if it's currently iktatva and a felelos was set
  if (felelos_user_id && felelos_user_id !== "none") {
    const { data: ugyirat } = await supabase.from("ugyirat").select("statusz").eq("id", ugyirat_id).single()
    if (ugyirat && ugyirat.statusz === "iktatva") {
      await supabase.from("ugyirat").update({ statusz: "szignalt" }).eq("id", ugyirat_id)
    }
  }

  const { getActiveCompanyIdServer } = await import("@/utils/company-server")
  const activeCompanyId = await getActiveCompanyIdServer()

  // 3. Log event
  if (user) {
    let reszletek = `Felelős frissítve.`
    if (felelos_user_id && felelos_user_id !== "none") {
      const { data: felelosProfile } = await supabase
        .from("felhasznalo_profil")
        .select("nev")
        .eq("id", felelos_user_id)
        .maybeSingle()
      if (felelosProfile?.nev) {
        reszletek = `Felelős kijelölve: ${felelosProfile.nev}.`
      }
    } else if (felelos_user_id === "none") {
      reszletek = `Felelős eltávolítva.`
    }
    if (hatarido) reszletek += ` Határidő: ${hatarido}.`

    const { getClientInfo } = await import("@/utils/client-info")
    const { ip, userAgent } = await getClientInfo()
    await supabase.from("esemeny_naplo").insert({
      entitas_tipus: 'ugyirat',
      entitas_id: ugyirat_id,
      user_id: user.id,
      esemeny_tipus: 'szignalva',
      indoklas: reszletek,
      uj_ertek: { felelos_user_id, hatarido },
      ip_cim: ip,
      user_agent: userAgent,
      ...(activeCompanyId ? { company_id: activeCompanyId } : {})
    })
  }

  // 4. Értesítés küldése, ha a szabály aktív és van új felelős
  if (felelos_user_id && felelos_user_id !== "none") {
    // Ellenőrizzük az értesítési szabályt (az aktív vállalatra szűrve)
    let szabalyQuery = supabase
      .from("ertesitesi_szabaly")
      .select("aktiv, csatorna")
      .eq("esemeny_tipus", "uj_szignalas")
      .eq("kinek", "felelos")
    if (activeCompanyId) {
      szabalyQuery = szabalyQuery.eq("company_id", activeCompanyId)
    }
    const { data: szabaly } = await szabalyQuery.limit(1).maybeSingle()

    if (szabaly?.aktiv) {
      const csatornak = szabaly.csatorna || ['in_app', 'email']
      
      if (csatornak.includes('in_app') || csatornak.includes('email') || csatornak.includes('sms')) {
        // Szervíz kulcs használata az email/telefon lekéréshez
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (serviceRoleKey) {
          const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
          const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey,
            { auth: { autoRefreshToken: false, persistSession: false } }
          )
          
          const { data: ugyiratData } = await supabase.from("ugyirat").select("iktatoszam").eq("id", ugyirat_id).single()
          const iktatoszam = ugyiratData?.iktatoszam || "Ismeretlen"

          if (csatornak.includes('in_app')) {
            await supabaseAdmin.from("alkalmazas_ertesites").insert({
              user_id: felelos_user_id,
              cim: `Új ügyirat szignálva: ${iktatoszam}`,
              szoveg: `Egy új ügyiratot szignáltak rád (${iktatoszam}). Határidő: ${hatarido || "Nincs megadva"}`,
              link_url: `/dossiers/${ugyirat_id}`
            })
          }

          if (csatornak.includes('email')) {
            const { data: adminData } = await supabaseAdmin.auth.admin.getUserById(felelos_user_id)
            const userEmail = adminData?.user?.email
            if (userEmail) {
              await sendNotificationEmail({
                to: userEmail,
                subject: `Új ügyirat szignálva: ${iktatoszam}`,
                html: buildHtmlEmail(
                  "Új feladatot kaptál!",
                  "Egy új ügyiratot szignáltak rád az eaisyDocs rendszerben.",
                  [
                    { label: "Iktatószám", value: iktatoszam },
                    { label: "Határidő", value: hatarido || "Nincs megadva" }
                  ],
                  "Ügyirat megtekintése",
                  `${getBaseUrl()}/dossiers/${ugyirat_id}`
                ),
                dossierId: ugyirat_id
              })
            }
          }

          if (csatornak.includes('sms')) {
            try {
              const { data: profileData } = await supabaseAdmin.from("felhasznalo_profil").select("telefon").eq("id", felelos_user_id).maybeSingle()
              const telefon = profileData?.telefon
              if (telefon) {
                const { sendSmsNotification } = await import('@/utils/sms/twilio')
                
                // Format phone number (replace 06 with +36)
                let formattedPhone = telefon.trim()
                if (formattedPhone.startsWith('06')) {
                  formattedPhone = '+36' + formattedPhone.substring(2)
                } else if (formattedPhone.startsWith('36')) {
                  formattedPhone = '+' + formattedPhone
                } else if (!formattedPhone.startsWith('+')) {
                  formattedPhone = '+36' + formattedPhone
                }

                await sendSmsNotification({
                  to: formattedPhone,
                  body: `eaisyDocs: Új ügyirat lett rád szignálva (Iktatószám: ${iktatoszam}).`,
                  subject: `Új szignálás: ${iktatoszam}`,
                  dossierId: ugyirat_id
                })
              }
            } catch (e) {
              console.error("SMS küldési hiba (uj_szignalas):", e)
            }
          }
        }
      }
    }
  }

  revalidatePath("/dossiers")
  revalidatePath(`/dossiers/${ugyirat_id}`)
  return { success: true }
}
