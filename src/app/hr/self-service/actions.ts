"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function submitLeaveRequest(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  const startDate = formData.get("startDate") as string
  const endDate = formData.get("endDate") as string
  const type = formData.get("type") as string

  if (!startDate || !endDate || !type) {
    return { error: "Minden mező kötelező" }
  }

  // --- ESZKALÁCIÓS MOTOR ---
  let aktualisJovahagyoId: string | null = null;
  const today = new Date().toISOString().split('T')[0];

  // 1. Lekérjük a dolgozó profilját (ki a vezetője?)
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("kozvetlen_vezeto_id")
    .eq("id", user.id)
    .single()

  let currentManagerId = profile?.kozvetlen_vezeto_id;

  if (currentManagerId) {
    // 2. Megnézzük, hogy a vezető elérhető-e MA
    const { data: managerLeave } = await supabase
      .from("hr_tavollet")
      .select("id")
      .eq("dolgozo_id", currentManagerId)
      .eq("statusz", "jovahagyva")
      .lte("kezdet_datuma", today)
      .gte("veg_datuma", today)
      .limit(1)
      .maybeSingle()

    if (managerLeave) {
      // A vezető távol van! 3. Van-e helyettes?
      const { data: substitute } = await supabase
        .from("hr_helyettesites")
        .select("helyettes_id")
        .eq("vezeto_id", currentManagerId)
        .eq("aktiv", true)
        .lte("kezdet_datuma", today)
        .gte("veg_datuma", today)
        .limit(1)
        .maybeSingle()
      
      if (substitute) {
        aktualisJovahagyoId = substitute.helyettes_id;
      } else {
        // Nincs helyettes, eszkaláljuk HR-re (később lehetne Grand-manager)
        currentManagerId = null;
      }
    } else {
      // A vezető elérhető
      aktualisJovahagyoId = currentManagerId;
    }
  }

  // 4. Ha nincs vezető, vagy a vezető távol van és nincs helyettes -> HR/Admin
  if (!currentManagerId && !aktualisJovahagyoId) {
    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: hrAdmin } = await supabaseAdmin
      .from("felhasznalo_profil")
      .select("id")
      .in("hr_szerepkor", ["hr_vezeto", "admin"])
      .limit(1)
      .maybeSingle();
    
    if (hrAdmin) {
      aktualisJovahagyoId = hrAdmin.id;
    }
  }

  const { error } = await supabase
    .from("hr_tavollet")
    .insert({
      dolgozo_id: user.id,
      kezdet_datuma: startDate,
      veg_datuma: endDate,
      tipus: type,
      statusz: "jovahagyasra_var",
      aktualis_jovahagyo_id: aktualisJovahagyoId
    })

  if (error) {
    console.error("Leave request error:", error)
    return { error: "Hiba történt az igénylés során." }
  }

  // Értesítés küldése az aktuális jóváhagyónak, ha van
  if (aktualisJovahagyoId) {
    const { data: szabaly } = await supabase
      .from("ertesitesi_szabaly")
      .select("aktiv, csatorna, kinek")
      .eq("esemeny_tipus", "szabadsag_jovahagyas")
      .maybeSingle();

    if (szabaly && szabaly.aktiv) {
      const csatornak = szabaly.csatorna || [];
      const { data: dolgozoProfil } = await supabase.from("felhasznalo_profil").select("nev").eq("id", user.id).maybeSingle();
      const dolgozoNev = dolgozoProfil?.nev || 'Egy munkatárs';

      if (csatornak.includes('in_app')) {
        await supabase.from('alkalmazas_ertesites').insert({
          user_id: aktualisJovahagyoId,
          cim: 'Új távollét kérelem',
          szoveg: `${dolgozoNev} új távollét kérelmet nyújtott be (${startDate} - ${endDate}).`,
          link_url: '/hr/manager'
        });
      }

      if (csatornak.includes('email')) {
        const { createClient: createAdminClient } = await import("@supabase/supabase-js");
        const adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { data: userResp } = await adminClient.auth.admin.getUserById(aktualisJovahagyoId);
        if (userResp?.user?.email) {
          try {
            const { sendNotificationEmail, buildHtmlEmail } = await import('@/utils/mailer');
            const { getBaseUrl } = await import('@/utils/url');
            await sendNotificationEmail({
              to: userResp.user.email,
              subject: `Új távollét kérelem jóváhagyásra: ${dolgozoNev}`,
              html: buildHtmlEmail(
                "Távollét kérelem jóváhagyása",
                `${dolgozoNev} új távollét kérelmet nyújtott be, amely a jóváhagyásodra vár.`,
                [
                  { label: "Időszak", value: `${startDate} - ${endDate}` },
                  { label: "Típus", value: type === 'szabadsag' ? 'Szabadság' : 'Betegszabadság' }
                ],
                "Kérelmek megtekintése",
                `${getBaseUrl()}/hr/manager`
              )
            });
          } catch (e) {
            console.error("Failed to send instant leave email", e);
          }
        }
      }

      if (csatornak.includes('sms')) {
        try {
          const { data: jovahagyoProfil } = await supabase.from("felhasznalo_profil").select("telefon").eq("id", aktualisJovahagyoId).maybeSingle();
          if (jovahagyoProfil?.telefon) {
            const { sendSmsNotification } = await import('@/utils/sms/twilio');
            await sendSmsNotification({
              to: jovahagyoProfil.telefon,
              body: `eaisyHR: ${dolgozoNev} új távollét kérelmet nyújtott be (${startDate} - ${endDate}), amely jóváhagyásra vár.`
            });
          }
        } catch (e) {
          console.error("Failed to send instant leave sms", e);
        }
      }
    }
  }

  revalidatePath("/hr/self-service")
  return { success: true }
}

export async function acknowledgeJobDescription(munkakorId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve" }

  const { error } = await supabase
    .from("hr_munkakor_nyugtazas")
    .insert({
      user_id: user.id,
      munkakor_id: munkakorId
    })

  if (error) {
    if (error.code === '23505') {
      // Already acknowledged (if we add a unique constraint, otherwise we just assume success if duplicate)
      return { success: true }
    }
    return { error: error.message }
  }

  revalidatePath("/hr/self-service")
  return { success: true }
}

export async function revealSecretData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  // Hívjuk meg az RPC-t, ami automatikusan naplózza a megtekintést!
  const { data, error } = await supabase.rpc("get_decrypted_hr_data", {
    p_dolgozo_id: user.id
  })

  if (error) {
    console.error("RPC error:", error)
    return { error: "Hozzáférés megtagadva vagy nincs rögzített adat." }
  }

  // Explicit logolás az új hr_esemeny_naplo táblába is (a régi eaisyDocs esemeny_naplo mellett)
  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "adat_megtekintes",
    entitas_tipus: "hr_dolgozo_titkos_adat",
    entitas_id: user.id,
    megjegyzes: "Szigorúan bizalmas dolgozói adatok feloldása és megtekintése"
  })

  return { data }
}

export async function updateSecretData(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  const taj_szam = formData.get("taj_szam") as string
  const adoazonosito = formData.get("adoazonosito") as string
  const bankszamla = formData.get("bankszamla") as string

  const { error } = await supabase.rpc("update_decrypted_hr_data", {
    p_dolgozo_id: user.id,
    p_taj_szam: taj_szam || "",
    p_adoazonosito: adoazonosito || "",
    p_bankszamla: bankszamla || ""
  })

  if (error) {
    console.error("Update RPC error:", error)
    return { error: `Hiba: ${error.message}` }
  }

  // Explicit logolás az új hr_esemeny_naplo táblába
  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "munkatars_felvetel", // modification
    entitas_tipus: "hr_dolgozo_titkos_adat",
    entitas_id: user.id,
    megjegyzes: "Szigorúan bizalmas dolgozói adatok módosítása"
  })

  return { success: true }
}

export async function toggleCheckIn() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  // Get current date's record
  const { data: todayRecord, error: fetchError } = await supabase
    .from("hr_jelenlet")
    .select("*")
    .eq("dolgozo_id", user.id)
    .eq("datum", new Date().toISOString().split('T')[0])
    .single()

  if (fetchError && fetchError.code !== "PGRST116") {
    console.error("Jelenlét lekérdezési hiba:", fetchError)
    return { error: "Nem sikerült lekérdezni a jelenlétet." }
  }

  if (!todayRecord) {
    // Check-in (Create record)
    const { error: insertError } = await supabase
      .from("hr_jelenlet")
      .insert({
        dolgozo_id: user.id,
        becsekkolas_ideje: new Date().toISOString()
      })
    
    if (insertError) return { error: "Sikertelen becsekkolás." }
    return { success: true, status: "checked_in" }
  } else if (!todayRecord.kicsekkolas_ideje) {
    // Check-out (Update record)
    const { error: updateError } = await supabase
      .from("hr_jelenlet")
      .update({ kicsekkolas_ideje: new Date().toISOString() })
      .eq("id", todayRecord.id)
    
    if (updateError) return { error: "Sikertelen kicsekkolás." }
    return { success: true, status: "checked_out" }
  } else {
    // Already checked out today
    return { error: "Ma már becsekkoltál és kicsekkoltál. Napi limit elérve." }
  }
}

export async function saveSubstitute(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const helyettesId = formData.get("helyettes_id") as string
  const kezdet_datuma = formData.get("kezdet_datuma") as string
  const veg_datuma = formData.get("veg_datuma") as string

  if (!helyettesId || !kezdet_datuma || !veg_datuma) {
    return { error: "Minden mező kötelező!" }
  }

  const { error } = await supabase
    .from("hr_helyettesites")
    .insert({
      vezeto_id: user.id,
      helyettes_id: helyettesId,
      kezdet_datuma,
      veg_datuma,
      aktiv: true
    })

  if (error) return { error: error.message }
  revalidatePath("/hr/self-service")
  return { success: true }
}

export async function deleteSubstitute(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { error } = await supabase
    .from("hr_helyettesites")
    .delete()
    .eq("id", id)
    .eq("vezeto_id", user.id)

  if (error) return { error: error.message }
  revalidatePath("/hr/self-service")
  return { success: true }
}
