'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export type IDPStatus = 'nyitott' | 'folyamatban' | 'jovahagyasra_var' | 'teljesitve' | 'elmaradt';
export type IDPGoalType = 'kompetencia' | 'kepzes' | 'nyelv' | 'egyeb';

export interface FejlesztesiTerv {
  id: string;
  dolgozo_id: string;
  ciklus_id: string | null;
  megnevezes: string;
  statusz: IDPStatus;
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
  tanulmanyi_szerzodes_id: string | null;
  eredmeny_kepzettseg_id: string | null;
  created_at: string;
  updated_at: string;
}

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

export async function createDevelopmentGoal(data: {
  terv_id: string;
  dolgozo_id: string;
  tipus: IDPGoalType;
  megnevezes: string;
  leiras?: string;
  hatarido?: string;
  tanulmanyi_szerzodes_id?: string;
}) {
  const supabase = await createClient();
  const { data: goal, error } = await supabase
    .from('hr_fejlesztesi_cel')
    .insert([data])
    .select()
    .single();

  if (error) {
    console.error('Hiba az IDP cél létrehozásakor:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/hr');
  return { success: true, data: goal };
}

export async function updateDevelopmentGoalStatus(celId: string, statusz: IDPStatus) {
  const supabase = await createClient();

  // Ha a vezető hagyja jóvá (teljesitve) és a típus képzés/nyelv, be kell írni a képzettségek közé.
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
    // Új képzettség bejegyzés generálása
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

  // Cél státuszának és a képzettség ID-jának frissítése
  const { error: updateError } = await supabase
    .from('hr_fejlesztesi_cel')
    .update({ 
      statusz, 
      eredmeny_kepzettseg_id: kepzettsegId,
      updated_at: new Date().toISOString()
    })
    .eq('id', celId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath('/hr');
  return { success: true };
}

export async function getDevelopmentPlansByEmployee(dolgozoId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('hr_fejlesztesi_terv')
    .select('*, celok:hr_fejlesztesi_cel(*)')
    .eq('dolgozo_id', dolgozoId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Hiba az IDP lekérdezésekor:', error);
    return [];
  }
  return data;
}
