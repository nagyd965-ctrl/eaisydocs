"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { sendNotificationEmail, buildHtmlEmail } from "@/utils/mailer"
import { getBaseUrl } from "@/utils/url"

export async function assignDossier(formData: FormData) {
  const ugy_id = formData.get("ugy_id") as string
  const felelos_user_id = formData.get("felelos_user_id") as string
  const hatarido = formData.get("hatarido") as string
  const ugyirat_id = formData.get("ugyirat_id") as string

  if (!ugy_id) return { error: "Hiányzó ügy azonosító" }

  const supabase = await createClient()

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

  // 3. Log event
  const { data: user } = await supabase.auth.getUser()
  if (user?.user) {
    let reszletek = `Felelős frissítve.`
    if (hatarido) reszletek += ` Határidő: ${hatarido}.`
    const { getClientInfo } = await import("@/utils/client-info")
    const { ip, userAgent } = await getClientInfo()
    await supabase.from("esemeny_naplo").insert({
      irat_id: null,
      ugyirat_id: ugyirat_id,
      felhasznalo_id: user.user.id,
      esemeny_tipus: 'hozzaferes_modositas',
      reszletek: reszletek,
      ip_cim: ip,
      user_agent: userAgent
    })
  }

  // 4. Értesítés küldése, ha a szabály aktív és van új felelős
  if (felelos_user_id && felelos_user_id !== "none") {
    // Ellenőrizzük az értesítési szabályt
    const { data: szabaly } = await supabase
      .from("ertesitesi_szabaly")
      .select("aktiv, csatorna")
      .eq("esemeny_tipus", "uj_szignalas")
      .eq("kinek", "felelos")
      .single()

    if (szabaly?.aktiv) {
      const csatornak = szabaly.csatorna || ['email']
      
      if (csatornak.includes('email') || csatornak.includes('sms')) {
        // Szervíz kulcs használata az email/telefon lekéréshez
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (serviceRoleKey) {
          const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
          const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey,
            { auth: { autoRefreshToken: false, persistSession: false } }
          )
          
          const { data: adminData } = await supabaseAdmin.auth.admin.getUserById(felelos_user_id)
          const userEmail = adminData?.user?.email
          
          const { data: ugyiratData } = await supabase.from("ugyirat").select("iktatoszam").eq("id", ugyirat_id).single()
          const iktatoszam = ugyiratData?.iktatoszam || "Ismeretlen"

          if (csatornak.includes('email') && userEmail) {
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

                const smsResult = await sendSmsNotification({
                  to: formattedPhone,
                  body: `eaisyDocs: Új ügyirat lett rád szignálva (Iktatószám: ${iktatoszam}).`
                })
                
                if (smsResult.success) {
                  await supabaseAdmin.from("ertesites_naplo").insert({
                    csatorna: 'sms', cimzett_email: formattedPhone, targy: `Új szignálás: ${iktatoszam}`, statusz: 'sikeres'
                  })
                } else {
                  console.error("SMS nem ment ki:", smsResult.error)
                  await supabaseAdmin.from("ertesites_naplo").insert({
                    csatorna: 'sms', cimzett_email: formattedPhone, targy: `Új szignálás: ${iktatoszam}`, statusz: 'sikertelen', reszletek: smsResult.error
                  })
                }
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
