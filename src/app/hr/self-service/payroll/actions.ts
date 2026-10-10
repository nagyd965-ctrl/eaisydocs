"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { acknowledgePayslipReceipt } from "@/utils/hr/payslip-calculator"
import { downloadPayslipPdfAction } from "@/app/hr/payroll/actions"

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface MyPayslipItem {
  id: string
  ev: number
  honap: number
  statusz: "kikuldve" | "atveve"
  bruttoAlapber: number
  bruttoOsszesen: number
  ledolgozottMunkanap: number
  szabadsagNap: number
  betegszabadsagNap: number
  tuloraOra: number
  bonuszJutalom: number
  cafeteriaBrutto: number

  // Kedvezmények
  kedvezmeny25EvAlatti: boolean
  csaladiKedvezmenyOsszeg: number
  adokedvezmenyekOsszesen: number

  // Levonások
  szjaLevonas: number
  tbJarulekLevonas: number
  letiltasEgyebLevonas: number
  levonasokOsszesen: number

  // Nettó és kifizetés
  nettoKifizetendo: number
  szochoMunkaltatoi: number
  bankszamlaszam: string
  kifizetesHatarido: string

  // Átvétel
  kikuldesDatuma: string | null
  atvetelDatuma: string | null
}

/**
 * Lekéri a bejelentkezett munkavállaló összes elérhető bérpapírját
 */
export async function getMyPayslipsAction(): Promise<{ data: MyPayslipItem[] | null; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "Nincs bejelentkezve" }

  const adminClient = getAdminClient()
  const { data, error } = await adminClient
    .from("hr_berpapir")
    .select("*")
    .eq("dolgozo_id", user.id)
    .in("statusz", ["kikuldve", "atveve"])
    .order("ev", { ascending: false })
    .order("honap", { ascending: false })

  if (error) {
    console.error("Hiba a bérpapírok lekérésekor:", error)
    return { data: null, error: error.message }
  }

  const items: MyPayslipItem[] = (data || []).map((p: any) => ({
    id: p.id,
    ev: p.ev,
    honap: p.honap,
    statusz: p.statusz,
    bruttoAlapber: Number(p.brutto_alapber || 0),
    bruttoOsszesen: Number(p.brutto_osszesen || 0),
    ledolgozottMunkanap: p.ledolgozott_munkanap || 0,
    szabadsagNap: p.szabadsag_nap || 0,
    betegszabadsagNap: p.betegszabadsag_nap || 0,
    tuloraOra: Number(p.tulora_ora || 0),
    bonuszJutalom: Number(p.bonusz_jutalom || 0),
    cafeteriaBrutto: Number(p.cafeteria_brutto || 0),
    kedvezmeny25EvAlatti: Boolean(p.kedvezmeny_25_ev_alatti),
    csaladiKedvezmenyOsszeg: Number(p.csaladi_kedvezmeny_osszeg || 0),
    adokedvezmenyekOsszesen: Number(p.adokedvezmenyek_osszesen || 0),
    szjaLevonas: Number(p.szja_levonas || 0),
    tbJarulekLevonas: Number(p.tb_jarulek_levonas || 0),
    letiltasEgyebLevonas: Number(p.letiltas_egyeb_levonas || 0),
    levonasokOsszesen: Number(p.levonasok_osszesen || 0),
    nettoKifizetendo: Number(p.netto_kifizetendo || 0),
    szochoMunkaltatoi: Number(p.szocho_munkaltatoi || 0),
    bankszamlaszam: p.bankszamlaszam || "",
    kifizetesHatarido: p.kifizetes_hatarido || "",
    kikuldesDatuma: p.kikuldes_datuma,
    atvetelDatuma: p.atvetel_datuma
  }))

  return { data: items }
}

/**
 * Munkavállalói digitális átvételi nyugtázás (Mt. 155. §)
 */
export async function acknowledgeMyPayslipAction(payslipId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nincs bejelentkezve" }

  const adminClient = getAdminClient()
  const { data: payslip, error } = await adminClient
    .from("hr_berpapir")
    .select("*")
    .eq("id", payslipId)
    .single()

  if (error || !payslip) return { success: false, error: "Bérpapír nem található" }
  if (payslip.dolgozo_id !== user.id) {
    return { success: false, error: "Csak a saját bérpapírod átvételét nyugtázhatod." }
  }

  if (payslip.statusz === "atveve") {
    return { success: true } // Már átvéve
  }

  const receipt = acknowledgePayslipReceipt({
    currentStatus: payslip.statusz,
    dolgozoId: user.id,
    acknowledgedAt: new Date()
  })

  const { error: updateErr } = await adminClient
    .from("hr_berpapir")
    .update({
      statusz: receipt.statusz,
      atvetel_datuma: receipt.atvetelDatuma,
      updated_at: new Date().toISOString()
    })
    .eq("id", payslipId)

  if (updateErr) {
    return { success: false, error: updateErr.message }
  }

  // Törvényes audit bejegyzés az eseménynaplóba
  await adminClient.from("esemeny_naplo").insert({
    entitas_tipus: "hr_berpapir",
    entitas_id: payslipId,
    esemeny_tipus: "irat_alairas",
    user_id: user.id,
    indoklas: receipt.auditLogText
  })

  revalidatePath("/hr/self-service/payroll")
  revalidatePath("/hr/payroll")

  return { success: true }
}

/**
 * Saját bérpapír PDF letöltése
 */
export async function downloadMyPayslipAction(payslipId: string) {
  return downloadPayslipPdfAction(payslipId)
}
