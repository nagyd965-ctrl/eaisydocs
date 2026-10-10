"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { checkMedicalValidityForDate } from "@/utils/hr/medical-compliance-checker"

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

  const note = (formData.get("note") as string) || null

  // Ha a kérelem csúsztatás (túlóra terhére kért szabadnap), ellenőrizzük a túlóra egyenleget
  let requiredMinutes = 0
  if (type === "csusztatas") {
    let workDays = 0
    const cur = new Date(startDate)
    const end = new Date(endDate)
    while (cur <= end) {
      const day = cur.getDay()
      if (day !== 0 && day !== 6) {
        workDays++
      }
      cur.setDate(cur.getDate() + 1)
    }
    workDays = Math.max(1, workDays)
    requiredMinutes = workDays * 480 // 8 óra / munkanap

    const { data: balanceData } = await supabase
      .from("hr_tulora_egyenleg")
      .select("perc")
      .eq("dolgozo_id", user.id)
      .maybeSingle()

    const currentBalance = balanceData?.perc ?? 0
    if (currentBalance < requiredMinutes) {
      const hReq = Math.floor(requiredMinutes / 60)
      const hAvail = Math.floor(Math.max(0, currentBalance) / 60)
      const mAvail = Math.max(0, currentBalance) % 60
      return {
        error: `Nincs elegendő túlóra egyenleged ehhez a csúsztatáshoz (${workDays} munkanap = ${hReq} óra). Jelenlegi egyenleged: ${hAvail} óra ${mAvail} perc.`
      }
    }
  }

  const { data: tavolletRow, error } = await supabase
    .from("hr_tavollet")
    .insert({
      dolgozo_id: user.id,
      kezdet_datuma: startDate,
      veg_datuma: endDate,
      tipus: type,
      statusz: "jovahagyasra_var",
      aktualis_jovahagyo_id: aktualisJovahagyoId
    })
    .select("id")
    .single()

  if (error) {
    console.error("Leave request error:", error)
    return { error: "Hiba történt az igénylés során." }
  }

  // Ha csúsztatás, létrehozzuk a kapcsolt túlóra felhasználási tételt is
  if (type === "csusztatas" && tavolletRow) {
    const { error: tuloraErr } = await supabase
      .from("hr_tulora_felhasznalás")
      .insert({
        dolgozo_id: user.id,
        tipus: "kiveszi_szabinak",
        perc: requiredMinutes,
        statusz: "jovahagyasra_var",
        datum: startDate,
        tavollet_id: tavolletRow.id,
        megjegyzes: note || "Csúsztatás (Túlóra terhére)"
      })

    if (tuloraErr) {
      console.error("Tulora usage link error:", tuloraErr)
    }
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
          cim: type === 'csusztatas' ? 'Új csúsztatási kérelem' : 'Új távollét kérelem',
          szoveg: `${dolgozoNev} új ${type === 'csusztatas' ? 'csúsztatási' : 'távollét'} kérelmet nyújtott be (${startDate} - ${endDate}).`,
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
                  { label: "Típus", value: type === 'csusztatas' ? 'Csúsztatás (Túlóra)' : type === 'szabadsag' ? 'Szabadság' : 'Betegszabadság' }
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

  revalidatePath("/hr", "layout")
  return { success: true }
}

export async function submitOvertimeRequest(data: {
  tipus: "kiveszi_szabinak" | "kifizetteti"
  perc: number
  datum?: string
  megjegyzes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  if (!data.perc || data.perc <= 0) {
    return { error: "Kérjük adj meg érvényes, 0-nál nagyobb időtartamot!" }
  }

  // Ellenőrizzük az egyenleget
  const { data: balanceData } = await supabase
    .from("hr_tulora_egyenleg")
    .select("perc")
    .eq("dolgozo_id", user.id)
    .maybeSingle()

  const currentBalance = balanceData?.perc ?? 0
  if (currentBalance < data.perc) {
    return {
      error: `Nincs elegendő túlóra egyenleged. Igényelt: ${Math.floor(data.perc / 60)} óra ${data.perc % 60} perc, Elérhető: ${Math.floor(Math.max(0, currentBalance) / 60)} óra ${Math.max(0, currentBalance) % 60} perc.`
    }
  }

  // Megkeressük a jóváhagyót (eszkalációs motor)
  let aktualisJovahagyoId: string | null = null
  const today = new Date().toISOString().split("T")[0]

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("kozvetlen_vezeto_id, nev")
    .eq("id", user.id)
    .single()

  let currentManagerId = profile?.kozvetlen_vezeto_id

  if (currentManagerId) {
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
        aktualisJovahagyoId = substitute.helyettes_id
      }
    } else {
      aktualisJovahagyoId = currentManagerId
    }
  }

  if (!aktualisJovahagyoId) {
    const { createClient: createAdminClient } = await import("@supabase/supabase-js")
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: hrAdmin } = await supabaseAdmin
      .from("felhasznalo_profil")
      .select("id")
      .in("hr_szerepkor", ["hr_vezeto", "admin"])
      .limit(1)
      .maybeSingle()

    if (hrAdmin) {
      aktualisJovahagyoId = hrAdmin.id
    }
  }

  let tavolletId: string | null = null

  if (data.tipus === "kiveszi_szabinak") {
    if (!data.datum) {
      return { error: "Kérjük válassz dátumot a csúsztatáshoz!" }
    }

    const { data: tavolletRow, error: tavolletErr } = await supabase
      .from("hr_tavollet")
      .insert({
        dolgozo_id: user.id,
        kezdet_datuma: data.datum,
        veg_datuma: data.datum,
        tipus: "csusztatas",
        statusz: "jovahagyasra_var",
        aktualis_jovahagyo_id: aktualisJovahagyoId
      })
      .select("id")
      .single()

    if (tavolletErr) {
      console.error("Tavollet create error for csusztatas:", tavolletErr)
      return { error: "Nem sikerült létrehozni a távolléti tételt: " + tavolletErr.message }
    }
    tavolletId = tavolletRow.id
  }

  const { error: tuloraErr } = await supabase
    .from("hr_tulora_felhasznalás")
    .insert({
      dolgozo_id: user.id,
      tipus: data.tipus,
      perc: data.perc,
      statusz: "jovahagyasra_var",
      datum: data.datum || null,
      tavollet_id: tavolletId,
      megjegyzes: data.megjegyzes || (data.tipus === "kiveszi_szabinak" ? "Csúsztatás (Túlóra terhére)" : "Túlóra kifizetési igény")
    })

  if (tuloraErr) {
    console.error("Tulora felhasznalas error:", tuloraErr)
    return { error: "Hiba történt a kérelem benyújtásakor: " + tuloraErr.message }
  }

  // Értesítés küldése a jóváhagyónak
  if (aktualisJovahagyoId) {
    const dolgozoNev = profile?.nev || "Egy munkatárs"
    const tipusNev = data.tipus === "kiveszi_szabinak" ? "csúsztatási" : "túlóra kifizetési"
    const idotartam = `${Math.floor(data.perc / 60)} óra ${data.perc % 60 > 0 ? `${data.perc % 60} perc` : ""}`.trim()

    await supabase.from("alkalmazas_ertesites").insert({
      user_id: aktualisJovahagyoId,
      cim: `Új ${tipusNev} kérelem`,
      szoveg: `${dolgozoNev} új ${tipusNev} kérelmet nyújtott be (${idotartam}${data.datum ? `, dátum: ${data.datum}` : ""}).`,
      link_url: "/hr/manager"
    })
  }

  revalidatePath("/hr", "layout")
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

  // Hívjuk meg az RPC-t, ami automatikusan visszafejti az adatokat
  const { data, error } = await supabase.rpc("get_decrypted_hr_data", {
    p_dolgozo_id: user.id
  })

  if (error) {
    console.error("RPC error:", error)
    return { error: "Hozzáférés megtagadva vagy nincs rögzített adat." }
  }

  // 15 másodperces időablak a duplikált naplózás megelőzésére
  const fifteenSecondsAgo = new Date(Date.now() - 15000).toISOString()
  const { data: recentLog } = await supabase
    .from("hr_esemeny_naplo")
    .select("id")
    .eq("felhasznalo_id", user.id)
    .eq("entitas_tipus", "hr_dolgozo_titkos_adat")
    .eq("entitas_id", user.id)
    .in("esemeny_tipus", ["megtekintes", "adat_megtekintes", "irat_megtekintes"])
    .gte("created_at", fifteenSecondsAgo)
    .limit(1)
    .maybeSingle()

  if (!recentLog) {
    await supabase.from("hr_esemeny_naplo").insert({
      felhasznalo_id: user.id,
      esemeny_tipus: "adat_megtekintes",
      entitas_tipus: "hr_dolgozo_titkos_adat",
      entitas_id: user.id,
      megjegyzes: "Saját bizalmas adatok (TAJ, Adó, Bankszámla) feloldása és megtekintése"
    })
  }

  return { data: data as { taj_szam?: string; adoazonosito?: string; bankszamla?: string; brutto_ber?: string; netto_ber?: string } }
}

export async function updateSecretData(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  const taj_szam     = formData.get("taj_szam")     as string
  const adoazonosito = formData.get("adoazonosito") as string
  const bankszamla   = formData.get("bankszamla")   as string
  // Béradatokat a dolgozó NEM módosíthatja – null-ként küldjük, 
  // az RPC CASE logika megőrzi az adatbázisban lévő értéket.

  const { error } = await supabase.rpc("update_decrypted_hr_data", {
    p_dolgozo_id:   user.id,
    p_taj_szam:     taj_szam     || "",
    p_adoazonosito: adoazonosito || "",
    p_bankszamla:   bankszamla   || "",
    // p_brutto_ber és p_netto_ber szándékosan nincs küldve – NULL marad, RPC nem írja felül
  })

  if (error) {
    console.error("Update RPC error:", error)
    return { error: `Hiba: ${error.message}` }
  }

  // Explicit logolás a hr_esemeny_naplo táblába
  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "modositas",
    entitas_tipus: "hr_dolgozo_titkos_adat",
    entitas_id: user.id,
    megjegyzes: "Saját bizalmas adatok módosítása"
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

  // Orvosi alkalmasság ellenőrzése becsekkolás előtt (HR-TASK-05, Mvt. 49. §)
  // Csak becsekkoláskor (új munkakezdés vagy folytatás) ellenőrizzük, a kicsekkolást soha nem blokkoljuk!
  if (!todayRecord || todayRecord.kicsekkolas_ideje) {
    const todayStr = new Date().toISOString().split("T")[0]
    const { data: adatlap } = await supabase
      .from("hr_dolgozo_adatlap")
      .select("orvosi_alkalmassag_ervenyesseg")
      .eq("id", user.id)
      .maybeSingle()

    const medicalCheck = checkMedicalValidityForDate(
      adatlap?.orvosi_alkalmassag_ervenyesseg,
      todayStr
    )

    if (!medicalCheck.isValid) {
      return {
        error: medicalCheck.errorMessage || "A becsekkolás sikertelen: Az orvosi alkalmasságod lejárt vagy hiányzik! Kérjük, fordulj a HR-hez!"
      }
    }
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
    revalidatePath("/hr")
    return { success: true, status: "checked_out" }
  } else {
    // Already checked out today -> Allow resuming work!
    const { error: resumeError } = await supabase
      .from("hr_jelenlet")
      .update({ kicsekkolas_ideje: null })
      .eq("id", todayRecord.id)

    if (resumeError) return { error: "Nem sikerült folytatni a munkát." }
    revalidatePath("/hr")
    return { success: true, status: "checked_in", resumed: true }
  }
}

export async function submitAttendanceCorrection(params: {
  datum: string
  becsekkolas: string
  kicsekkolas: string
  indoklas: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  const { datum, becsekkolas, kicsekkolas, indoklas } = params

  if (!datum || !becsekkolas || !kicsekkolas || !indoklas?.trim()) {
    return { error: "A dátum, az időpontok és az indoklás megadása kötelező!" }
  }

  // Időpontok összeállítása ISO formátumban
  const becsekIso = new Date(`${datum}T${becsekkolas}:00`).toISOString()
  const kicsekIso = new Date(`${datum}T${kicsekkolas}:00`).toISOString()

  if (new Date(kicsekIso).getTime() <= new Date(becsekIso).getTime()) {
    return { error: "A távozás időpontja nem lehet korábbi vagy egyenlő az érkezésnél!" }
  }

  // Ellenőrizzük, hogy le van-e zárva a hónap
  const dateObj = new Date(datum)
  const ev = dateObj.getFullYear()
  const honap = dateObj.getMonth() + 1
  const { data: zaras } = await supabase
    .from("hr_havi_jelenlet_zaras")
    .select("statusz")
    .eq("dolgozo_id", user.id)
    .eq("ev", ev)
    .eq("honap", honap)
    .single()

  if (zaras && zaras.statusz !== "nyitott") {
    return { error: "Ez a hónap már le van zárva, utólagos módosítás nem lehetséges!" }
  }

  // Meglévő jelenlét lekérése az eredeti adatok mentéséhez
  const { data: existing } = await supabase
    .from("hr_jelenlet")
    .select("id, becsekkolas_ideje, kicsekkolas_ideje")
    .eq("dolgozo_id", user.id)
    .eq("datum", datum)
    .maybeSingle()

  // Megkeressük a közvetlen vezetőt vagy kijelölt jóváhagyót
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("nev, kozvetlen_vezeto_id")
    .eq("id", user.id)
    .single()

  let aktualisJovahagyoId = profile?.kozvetlen_vezeto_id || null

  // Ha a vezető távol van, ellenőrizzük a helyettesítést
  if (aktualisJovahagyoId) {
    const today = new Date().toISOString().split("T")[0]
    const { data: substitute } = await supabase
      .from("hr_helyettesites")
      .select("helyettes_id")
      .eq("vezeto_id", aktualisJovahagyoId)
      .eq("aktiv", true)
      .lte("kezdet_datuma", today)
      .gte("veg_datuma", today)
      .limit(1)
      .maybeSingle()

    if (substitute) {
      aktualisJovahagyoId = substitute.helyettes_id
    }
  }

  // Ha nincs közvetlen vezető, HR vezetőt vagy admint keresünk
  if (!aktualisJovahagyoId) {
    const { data: hrAdmin } = await supabase
      .from("felhasznalo_profil")
      .select("id")
      .in("hr_szerepkor", ["hr_vezeto", "admin"])
      .limit(1)
      .maybeSingle()

    if (hrAdmin) {
      aktualisJovahagyoId = hrAdmin.id
    }
  }

  // Korrekciós kérelem rögzítése a hr_jelenlet_korrekcio táblába
  const { data: insertedRequest, error: insertError } = await supabase
    .from("hr_jelenlet_korrekcio")
    .insert({
      dolgozo_id: user.id,
      datum,
      eredeti_becsekkolas: existing?.becsekkolas_ideje || null,
      eredeti_kicsekkolas: existing?.kicsekkolas_ideje || null,
      uj_becsekkolas: becsekIso,
      uj_kicsekkolas: kicsekIso,
      indoklas: indoklas.trim(),
      statusz: "jovahagyasra_var",
      jovahagyo_id: aktualisJovahagyoId
    })
    .select("id")
    .single()

  if (insertError) {
    console.error("Korrekciós kérelem beszúrási hiba:", insertError)
    return { error: "Nem sikerült benyújtani a kérelmet: " + insertError.message }
  }

  // Értesítés a vezetőnek
  if (aktualisJovahagyoId) {
    const dolgozoNev = profile?.nev || "Egy munkatárs"
    await supabase.from("alkalmazas_ertesites").insert({
      user_id: aktualisJovahagyoId,
      cim: "Új munkaidő korrekciós kérelem",
      szoveg: `${dolgozoNev} munkaidő korrekciós kérelmet nyújtott be (${datum}: ${becsekkolas} - ${kicsekkolas}). Indoklás: ${indoklas}`,
      link_url: "/hr/manager"
    })
  }

  // Audit naplózás a hr_esemeny_naplo táblába
  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    entitas_tipus: "hr_jelenlet_korrekcio",
    entitas_id: insertedRequest?.id || null,
    esemeny_tipus: "jelenlet_korrekcio_keres",
    megjegyzes: `Munkavállalói jelenlét korrekciós kérelem (${datum}): ${becsekkolas} - ${kicsekkolas}. Indoklás: ${indoklas}`,
  })

  revalidatePath("/hr")
  revalidatePath("/hr/manager")
  revalidatePath("/hr/self-service/time")

  return { success: true, isRequest: true }
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
