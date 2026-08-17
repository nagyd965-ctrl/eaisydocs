'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export type IDPStatus = 'nyitott' | 'folyamatban' | 'jovahagyasra_var' | 'teljesitve' | 'elmaradt';
export type IDPGoalType = 'kompetencia' | 'kepzes' | 'nyelv' | 'egyeb';
export type IDPPriority = 'magas' | 'kozepes' | 'alacsony';

export interface FejlesztesiTerv {
  id: string;
  dolgozo_id: string;
  ciklus_id: string | null;
  megnevezes: string;
  statusz: IDPStatus | 'lezart';
  created_at: string;
  updated_at: string;
}

export interface FejlesztesiCel {
  id: string;
  terv_id: string;
  dolgozo_id: string;
  tipus: IDPGoalType;
  megnevezes: string;
  leiras: string | null;
  hatarido: string | null;
  statusz: IDPStatus;
  prioritas: IDPPriority;
  mentor: string | null;
  teljesites_datuma: string | null;
  tanulmanyi_szerzodes_id: string | null;
  eredmeny_kepzettseg_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface IDPMegjegyzes {
  id: string;
  cel_id: string;
  szoveg: string;
  iro_id: string | null;
  iro?: { nev: string } | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Terv műveletek
// ---------------------------------------------------------------------------

export async function createDevelopmentPlan(data: {
  dolgozo_id: string;
  ciklus_id?: string;
  megnevezes: string;
}) {
  const supabase = await createClient();
  const { data: plan, error } = await supabase
    .from('hr_fejlesztesi_terv')
    .insert([data])
    .select()
    .single();

  if (error) {
    console.error('Hiba az IDP terv létrehozásakor:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/hr');
  return { success: true, data: plan };
}

export async function deleteDevelopmentPlan(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('hr_fejlesztesi_terv')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Hiba az IDP terv törlésekor:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/hr');
  return { success: true };
}

export async function closeDevelopmentPlan(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('hr_fejlesztesi_terv')
    .update({ statusz: 'lezart', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Hiba a terv lezárásakor:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/hr');
  return { success: true };
}

// ---------------------------------------------------------------------------
// Célkitűzés műveletek
// ---------------------------------------------------------------------------

export async function createDevelopmentGoal(data: {
  terv_id: string;
  dolgozo_id: string;
  tipus: IDPGoalType;
  megnevezes: string;
  leiras?: string;
  hatarido?: string;
  prioritas?: IDPPriority;
  mentor?: string;
  tanulmanyi_szerzodes_id?: string;
}) {
  const supabase = await createClient();
  const { data: goal, error } = await supabase
    .from('hr_fejlesztesi_cel')
    .insert([{ prioritas: 'kozepes', ...data }])
    .select()
    .single();

  if (error) {
    console.error('Hiba az IDP cél létrehozásakor:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/hr');
  return { success: true, data: goal };
}

export async function updateDevelopmentGoal(celId: string, data: {
  megnevezes?: string;
  leiras?: string;
  hatarido?: string;
  tipus?: IDPGoalType;
  prioritas?: IDPPriority;
  mentor?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('hr_fejlesztesi_cel')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', celId);

  if (error) {
    console.error('Hiba az IDP cél frissítésekor:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/hr');
  return { success: true };
}

export async function deleteDevelopmentGoal(celId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('hr_fejlesztesi_cel')
    .delete()
    .eq('id', celId);

  if (error) {
    console.error('Hiba az IDP cél törlésekor:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/hr');
  return { success: true };
}

export async function updateDevelopmentGoalStatus(celId: string, statusz: IDPStatus) {
  const supabase = await createClient();

  const { data: cel, error: fetchError } = await supabase
    .from('hr_fejlesztesi_cel')
    .select('*')
    .eq('id', celId)
    .single();

  if (fetchError || !cel) {
    return { success: false, error: fetchError?.message || 'Cél nem található' };
  }

  let kepzettsegId = cel.eredmeny_kepzettseg_id;

  if (statusz === 'teljesitve' && (cel.tipus === 'kepzes' || cel.tipus === 'nyelv') && !kepzettsegId) {
    const { data: kepzettseg, error: kepzError } = await supabase
      .from('hr_kepzettseg')
      .insert([{
        dolgozo_id: cel.dolgozo_id,
        tipus: cel.tipus === 'kepzes' ? 'tanfolyam' : 'nyelvvizsga',
        megnevezes: cel.megnevezes,
        intezmeny: 'IDP modul automatikus bejegyzés',
        megszerzes_datuma: new Date().toISOString().split('T')[0]
      }])
      .select()
      .single();

    if (kepzError) {
      console.error('Hiba a képzettség rögzítésekor:', kepzError);
      return { success: false, error: kepzError.message };
    }
    kepzettsegId = kepzettseg.id;
  }

  const updateData: Record<string, unknown> = {
    statusz,
    eredmeny_kepzettseg_id: kepzettsegId,
    updated_at: new Date().toISOString(),
  };

  if (statusz === 'teljesitve') {
    updateData.teljesites_datuma = new Date().toISOString().split('T')[0];
  }

  const { error: updateError } = await supabase
    .from('hr_fejlesztesi_cel')
    .update(updateData)
    .eq('id', celId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath('/hr');
  return { success: true };
}

// ---------------------------------------------------------------------------
// Haladási megjegyzések
// ---------------------------------------------------------------------------

export async function addIDPNote(celId: string, szoveg: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Nincs bejelentkezve' };

  const { error } = await supabase
    .from('hr_idp_megjegyzes')
    .insert([{ cel_id: celId, szoveg, iro_id: user.id }]);

  if (error) {
    console.error('Hiba a megjegyzés mentésekor:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/hr');
  return { success: true };
}

// ---------------------------------------------------------------------------
// Lekérdezések
// ---------------------------------------------------------------------------

export async function getDevelopmentPlansByEmployee(dolgozoId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('hr_fejlesztesi_terv')
    .select(`
      *,
      celok:hr_fejlesztesi_cel(
        *,
        megjegyzesek:hr_idp_megjegyzes(*, iro:felhasznalo_profil(nev))
      )
    `)
    .eq('dolgozo_id', dolgozoId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Hiba az IDP lekérdezésekor:', error);
    return [];
  }
  return data;
}
