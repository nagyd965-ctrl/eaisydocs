"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

// -----------------------------------------------------------------------------
// Előző munkahelyek
// -----------------------------------------------------------------------------

export async function addWorkplace(employeeId: string, formData: FormData) {
  const supabase = await createClient()

  const munkaltato_neve = formData.get("munkaltato_neve") as string
  const pozicio = formData.get("pozicio") as string
  const jogviszony_tipusa = formData.get("jogviszony_tipusa") as string
  const kezdet_datuma = formData.get("kezdet_datuma") as string
  const veg_datuma = formData.get("veg_datuma") as string

  if (!munkaltato_neve || !pozicio || !kezdet_datuma || !veg_datuma) {
    return { error: "Minden kötelező mezőt ki kell tölteni!" }
  }

  const today = new Date().toISOString().split("T")[0]
  if (kezdet_datuma > today || veg_datuma > today) {
    return { error: "A dátumok nem lehetnek a jövőben!" }
  }
  if (kezdet_datuma > veg_datuma) {
    return { error: "A kezdet dátuma nem lehet később, mint a vég dátuma!" }
  }

  const { error } = await supabase.from("hr_elozo_munkahely").insert({
    dolgozo_id: employeeId,
    munkaltato_neve,
    pozicio,
    jogviszony_tipusa,
    kezdet_datuma,
    veg_datuma,
  })

  if (error) return { error: error.message }

  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

export async function deleteWorkplace(id: string, employeeId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("hr_elozo_munkahely").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

// -----------------------------------------------------------------------------
// Képzettségek
// -----------------------------------------------------------------------------

export async function addQualification(employeeId: string, formData: FormData) {
  const supabase = await createClient()

  const tipus = formData.get("tipus") as string
  const megnevezes = formData.get("megnevezes") as string
  const intezmeny = formData.get("intezmeny") as string
  const bizonyitvany_szam = formData.get("bizonyitvany_szam") as string
  const megszerzes_datuma = formData.get("megszerzes_datuma") as string
  const fokozat = formData.get("fokozat") as string

  const file = formData.get("file") as File | null

  if (!tipus || !megnevezes) {
    return { error: "A típus és a megnevezés kitöltése kötelező!" }
  }

  if (megszerzes_datuma) {
    const today = new Date().toISOString().split("T")[0]
    if (megszerzes_datuma > today) {
      return { error: "A megszerzés dátuma nem lehet a jövőben!" }
    }
  }

  let fileUrl = null
  if (file && file.size > 0) {
    const fileExt = file.name.split('.').pop()
    const fileName = `kepzettseg_${Date.now()}.${fileExt}`
    const filePath = `dolgozo_${employeeId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from("irat_files")
      .upload(filePath, file)

    if (uploadError) {
      console.error("Fájl feltöltési hiba:", uploadError)
      return { error: "Hiba történt a fájl feltöltésekor." }
    }
    fileUrl = filePath
  }

  const { error } = await supabase.from("hr_kepzettseg").insert({
    dolgozo_id: employeeId,
    tipus,
    megnevezes,
    intezmeny,
    bizonyitvany_szam,
    megszerzes_datuma: megszerzes_datuma || null,
    fokozat,
    dokumentum_url: fileUrl
  })

  if (error) return { error: error.message }

  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

export async function getQualificationFileUrl(filePath: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.storage.from("irat_files").createSignedUrl(filePath, 3600)
  if (error || !data) return { error: "Nem sikerült legenerálni a linket." }
  return { url: data.signedUrl }
}

export async function deleteQualification(id: string, employeeId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("hr_kepzettseg").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

// -----------------------------------------------------------------------------
// Tanulmányi szerződések
// -----------------------------------------------------------------------------

export async function addStudyContract(employeeId: string, formData: FormData) {
  const supabase = await createClient()

  const kepzes_neve = formData.get("kepzes_neve") as string
  const koltseg = formData.get("koltseg") as string
  const vallalt_munkaviszony_honap = formData.get("vallalt_munkaviszony_honap") as string
  const lejarat_datuma = formData.get("lejarat_datuma") as string
  const visszafizetesi_kotelezettseg = formData.get("visszafizetesi_kotelezettseg") === "on"

  if (!kepzes_neve) {
    return { error: "A képzés nevének kitöltése kötelező!" }
  }

  const { error } = await supabase.from("hr_tanulmanyi_szerzodes").insert({
    dolgozo_id: employeeId,
    kepzes_neve,
    koltseg: koltseg ? parseFloat(koltseg) : null,
    vallalt_munkaviszony_honap: vallalt_munkaviszony_honap ? parseInt(vallalt_munkaviszony_honap, 10) : null,
    lejarat_datuma: lejarat_datuma || null,
    visszafizetesi_kotelezettseg,
  })

  if (error) return { error: error.message }

  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

export async function deleteStudyContract(id: string, employeeId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("hr_tanulmanyi_szerzodes").delete().eq("id", id).eq("dolgozo_id", employeeId)
  if (error) return { error: error.message }
  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

export async function addOrvosiVizsgalat(employeeId: string, formData: FormData) {
  const supabase = await createClient()

  const tipus = formData.get("tipus") as string
  const vizsgalat_datuma = formData.get("vizsgalat_datuma") as string
  const ervenyesseg_datuma = formData.get("ervenyesseg_datuma") as string
  const eredmeny = formData.get("eredmeny") as string
  const megjegyzes = formData.get("megjegyzes") as string

  if (!tipus || !vizsgalat_datuma || !ervenyesseg_datuma || !eredmeny) {
    return { error: "Minden kötelező mezőt ki kell tölteni!" }
  }

  const today = new Date().toISOString().split("T")[0]
  if (vizsgalat_datuma > today) {
    return { error: "A vizsgálat dátuma nem lehet a jövőben!" }
  }
  if (vizsgalat_datuma > ervenyesseg_datuma) {
    return { error: "A vizsgálat dátuma nem lehet később, mint az érvényesség dátuma!" }
  }

  const { error } = await supabase.from("hr_orvosi_vizsgalat").insert({
    dolgozo_id: employeeId,
    tipus,
    vizsgalat_datuma,
    ervenyesseg_datuma,
    eredmeny,
    megjegyzes: megjegyzes || null
  })

  if (error) return { error: error.message }

  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

export async function deleteOrvosiVizsgalat(id: string, employeeId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("hr_orvosi_vizsgalat").delete().eq("id", id).eq("dolgozo_id", employeeId)
  if (error) return { error: error.message }
  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

export async function addFegyelmi(employeeId: string, formData: FormData) {
  const supabase = await createClient()

  const tipus = formData.get("tipus") as string
  const datum = formData.get("datum") as string
  const indoklas = formData.get("indoklas") as string

  if (!tipus || !datum || !indoklas) {
    return { error: "Minden kötelező mezőt ki kell tölteni!" }
  }

  const today = new Date().toISOString().split("T")[0]
  if (datum > today) {
    return { error: "A dátum nem lehet a jövőben!" }
  }

  const { error } = await supabase.from("hr_fegyelmi").insert({
    dolgozo_id: employeeId,
    tipus,
    datum,
    indoklas
  })

  if (error) return { error: error.message }

  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

export async function deleteFegyelmi(id: string, employeeId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("hr_fegyelmi").delete().eq("id", id).eq("dolgozo_id", employeeId)
  if (error) return { error: error.message }
  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

export async function revealEmployeeSecretData(employeeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data, error } = await supabase.rpc("get_decrypted_hr_data", {
    p_dolgozo_id: employeeId
  })

  if (error) {
    console.error("RPC error:", error)
    return { error: "Hozzáférés megtagadva vagy nincs rögzített adat." }
  }

  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "irat_megtekintes", 
    entitas_tipus: "hr_dolgozo_titkos_adat",
    entitas_id: employeeId,
    megjegyzes: `HR/Admin betekintett a dolgozó (${employeeId}) bizalmas adataiba.`
  })

  return { data }
}

export async function updateEmployeeSecretData(employeeId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const taj_szam = formData.get("taj_szam") as string
  const adoazonosito = formData.get("adoazonosito") as string
  const bankszamla = formData.get("bankszamla") as string

  const { error } = await supabase.rpc("update_decrypted_hr_data", {
    p_dolgozo_id: employeeId,
    p_taj_szam: taj_szam || "",
    p_adoazonosito: adoazonosito || "",
    p_bankszamla: bankszamla || ""
  })

  if (error) {
    console.error("Update RPC error:", error)
    return { error: `Hiba: ${error.message}` }
  }

  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "munkatars_modositas",
    entitas_tipus: "hr_dolgozo_titkos_adat",
    entitas_id: employeeId,
    megjegyzes: `HR/Admin módosította a dolgozó (${employeeId}) bizalmas adatait.`
  })

  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

export async function updateGeneralPersonalInfo(employeeId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const szuletesi_datum = formData.get("szuletesi_datum") as string
  const anyja_neve = formData.get("anyja_neve") as string
  const lakcim = formData.get("lakcim") as string
  const telefonszam = formData.get("telefonszam") as string

  const { error } = await supabase
    .from("hr_dolgozo_adatlap")
    .update({
      szuletesi_datum: szuletesi_datum || null,
      anyja_neve: anyja_neve || null,
      lakcim: lakcim || null,
      telefonszam: telefonszam || null
    })
    .eq("id", employeeId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

export async function updateJogviszonyData(employeeId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const ervenyes_tol = formData.get("ervenyes_tol") as string
  const belepes_datuma = formData.get("belepes_datuma") as string
  const munkaviszony_tipusa = formData.get("munkaviszony_tipusa") as string
  const munkaido_fte = formData.get("munkaido_fte") as string
  const munkarend = formData.get("munkarend") as string
  const berkategoria = formData.get("berkategoria") as string
  const kozvetlen_vezeto = formData.get("kozvetlen_vezeto") as string
  let munkakor_id = formData.get("munkakor_id") as string | null

  if (!ervenyes_tol) {
    return { error: "Az érvényesség kezdete (Érvényes-től) mező megadása kötelező!" }
  }

  // Jelenlegi munkakör lekérése, ha nem küldtek újat
  if (!munkakor_id) {
    const { data: currProfile } = await supabase
      .from("hr_dolgozo_adatlap")
      .select(`hr_jogviszony ( hr_beosztas ( munkakor_id ) )`)
      .eq("id", employeeId)
      .single()

    const jogviszonyok = (currProfile as any)?.hr_jogviszony
    if (jogviszonyok && jogviszonyok.length > 0) {
      const beosztasok = jogviszonyok[0].hr_beosztas
      if (beosztasok && beosztasok.length > 0) {
        munkakor_id = beosztasok[0].munkakor_id
      }
    }
  }

  const { error } = await supabase.rpc('update_hr_beosztas_history', {
    p_dolgozo_id: employeeId,
    p_ervenyes_tol: ervenyes_tol,
    p_munkakor_id: munkakor_id,
    p_munkaviszony_tipusa: munkaviszony_tipusa || null,
    p_munkaido_fte: munkaido_fte ? parseFloat(munkaido_fte) : null,
    p_munkarend: munkarend || null,
    p_berkategoria: berkategoria || null,
    p_kozvetlen_vezeto: kozvetlen_vezeto || null,
    p_belepes_datuma: belepes_datuma || null
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

export async function uploadHrDocument(employeeId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const file = formData.get("file") as File
  const nev = formData.get("nev") as string
  const kategoria = formData.get("kategoria") as string

  if (!file || file.size === 0) {
    return { error: "Nem választottál ki fájlt a feltöltéshez!" }
  }

  if (!nev) {
    return { error: "A dokumentum neve kötelező!" }
  }

  const timestamp = Date.now()
  const safeFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")
  const filePath = `hr/${employeeId}/${timestamp}_${safeFilename}`

  // Fájl feltöltése a Supabase Storage-ba
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("irat_files")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false
    })

  if (uploadError) {
    console.error("Storage upload error:", uploadError)
    return { error: "Hiba történt a fájl feltöltése során: " + uploadError.message }
  }

  // Rekord létrehozása a hr_dokumentum táblában
  const { error: insertError } = await supabase
    .from("hr_dokumentum")
    .insert([
      {
        dolgozo_id: employeeId,
        nev: nev,
        kategoria: kategoria || "Egyéb",
        url: filePath
      }
    ])

  if (insertError) {
    console.error("DB insert error:", insertError)
    // Ha az adatbázis mentés sikertelen, megpróbáljuk törölni a feltöltött fájlt
    await supabase.storage.from("irat_files").remove([filePath])
    return { error: "Hiba történt a dokumentum mentése során: " + insertError.message }
  }

  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

export async function hrSubmitLeaveRequest(employeeId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  const type = formData.get("type") as string
  const startDate = formData.get("startDate") as string
  const endDate = formData.get("endDate") as string
  
  if (!type || !startDate || !endDate) {
    return { error: "Minden kötelező mezőt ki kell tölteni!" }
  }

  if (startDate > endDate) {
    return { error: "A kezdet dátuma nem lehet később, mint a vég dátuma!" }
  }

  const { error } = await supabase
    .from("hr_tavollet")
    .insert({
      dolgozo_id: employeeId,
      tipus: type,
      kezdet_datuma: startDate,
      veg_datuma: endDate,
      statusz: "jovahagyva", // HR automatikusan jóváhagyottan hozza létre
      jovahagyo_id: user.id
    })

  if (error) {
    console.error("HR submit leave error:", error)
    return { error: "Hiba történt a távollét rögzítésekor." }
  }

  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}
