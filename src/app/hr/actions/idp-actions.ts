'use server';

import { createClient } from '@/utils/supabase/server';
import { getActiveCompanyIdServer } from '@/utils/company-server';
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
  company_id?: string | null;
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
  mentor_id?: string | null;
  mentor_profil?: { id: string; nev: string } | null;
  intezmeny?: string | null;
  koltseg?: number | null;
  finanszirozas?: 'ceg' | 'dolgozo' | 'ingyenes' | 'vegyes' | string | null;
  tanusitvany_url?: string | null;
  tanusitvany_nev?: string | null;
  tanusitvany_feltoltve_at?: string | null;
  elutasitas_indoklas?: string | null;
  teljesites_datuma: string | null;
  tanulmanyi_szerzodes_id: string | null;
  tanulmanyi_szerzodes?: { id: string; intezmeny_neve?: string; kepzes_neve?: string; szerzodes_szam?: string } | null;
  eredmeny_kepzettseg_id: string | null;
  company_id?: string | null;
  created_at: string;
  updated_at: string;
  megjegyzesek?: IDPMegjegyzes[];
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
  const companyId = await getActiveCompanyIdServer();

  const { data: plan, error } = await supabase
    .from('hr_fejlesztesi_terv')
    .insert([{ ...data, company_id: companyId }])
    .select()
    .single();

  if (error) {
    console.error('Hiba az IDP terv létrehozásakor:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/hr');
  revalidatePath(`/hr/employee/${data.dolgozo_id}`);
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
  const { data: plan } = await supabase
    .from('hr_fejlesztesi_terv')
    .select('dolgozo_id')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('hr_fejlesztesi_terv')
    .update({ statusz: 'lezart', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Hiba a terv lezárásakor:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/hr');
  if (plan?.dolgozo_id) {
    revalidatePath(`/hr/employee/${plan.dolgozo_id}`);
  }
  revalidatePath('/hr/self-service/idp');
  return { success: true };
}

export async function reopenDevelopmentPlan(id: string) {
  const supabase = await createClient();
  const { data: plan } = await supabase
    .from('hr_fejlesztesi_terv')
    .select('dolgozo_id')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('hr_fejlesztesi_terv')
    .update({ statusz: 'nyitott', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Hiba a terv újranyitásakor:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/hr');
  if (plan?.dolgozo_id) {
    revalidatePath(`/hr/employee/${plan.dolgozo_id}`);
  }
  revalidatePath('/hr/self-service/idp');
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
  mentor_id?: string;
  intezmeny?: string;
  koltseg?: number;
  finanszirozas?: string;
  tanulmanyi_szerzodes_id?: string;
}) {
  const supabase = await createClient();
  const companyId = await getActiveCompanyIdServer();

  const insertData: Record<string, any> = {
    prioritas: 'kozepes',
    ...data,
    company_id: companyId,
  };

  // Tisztítás: üres stringek null-ra
  if (!insertData.mentor_id) delete insertData.mentor_id;
  if (!insertData.tanulmanyi_szerzodes_id) delete insertData.tanulmanyi_szerzodes_id;
  if (!insertData.hatarido) delete insertData.hatarido;
  if (!insertData.koltseg) delete insertData.koltseg;

  const { data: goal, error } = await supabase
    .from('hr_fejlesztesi_cel')
    .insert([insertData])
    .select()
    .single();

  if (error) {
    console.error('Hiba az IDP cél létrehozásakor:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/hr');
  revalidatePath(`/hr/employee/${data.dolgozo_id}`);
  revalidatePath('/hr/self-service/idp');
  return { success: true, data: goal };
}

export async function updateDevelopmentGoal(celId: string, data: {
  megnevezes?: string;
  leiras?: string;
  hatarido?: string;
  tipus?: IDPGoalType;
  prioritas?: IDPPriority;
  mentor?: string;
  mentor_id?: string | null;
  intezmeny?: string | null;
  koltseg?: number | null;
  finanszirozas?: string | null;
  tanulmanyi_szerzodes_id?: string | null;
}) {
  const supabase = await createClient();

  const updateData: Record<string, any> = {
    ...data,
    updated_at: new Date().toISOString(),
  };

  if (updateData.mentor_id === '') updateData.mentor_id = null;
  if (updateData.tanulmanyi_szerzodes_id === '') updateData.tanulmanyi_szerzodes_id = null;
  if (updateData.hatarido === '') updateData.hatarido = null;

  const { error } = await supabase
    .from('hr_fejlesztesi_cel')
    .update(updateData)
    .eq('id', celId);

  if (error) {
    console.error('Hiba az IDP cél frissítésekor:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/hr');
  revalidatePath('/hr/self-service/idp');
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
  revalidatePath('/hr/self-service/idp');
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
        intezmeny: cel.intezmeny || 'Egyéni fejlesztési terv',
        megszerzes_datuma: new Date().toISOString().split('T')[0]
      }])
      .select()
      .single();

    if (kepzError) {
      console.error('Hiba a képzettség rögzítésekor:', kepzError);
    } else {
      kepzettsegId = kepzettseg.id;
    }
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
  revalidatePath('/hr/self-service/idp');
  return { success: true };
}

// ---------------------------------------------------------------------------
// Tanúsítvány Feltöltés és Jóváhagyási Munkamenet
// ---------------------------------------------------------------------------

export async function uploadIDPCertificateAction(formData: FormData) {
  const celId = formData.get('celId') as string;
  const file = formData.get('file') as File;
  const megjegyzes = (formData.get('megjegyzes') as string) || '';

  if (!celId || !file || file.size === 0) {
    return { success: false, error: 'Érvénytelen fájl vagy cél azonosító' };
  }

  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return { success: false, error: 'A feltöltött fájl nem haladhatja meg a 10 MB-ot!' };
  }

  const allowedExts = ['pdf', 'png', 'jpg', 'jpeg', 'webp'];
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!allowedExts.includes(ext)) {
    return { success: false, error: 'Kizárólag PDF vagy kép (PNG, JPG) tölthető fel!' };
  }

  const { createClient: createAdminClient } = await import('@supabase/supabase-js');
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: cel, error: celErr } = await adminClient
    .from('hr_fejlesztesi_cel')
    .select('*, hr_fejlesztesi_terv(company_id)')
    .eq('id', celId)
    .single();

  if (celErr || !cel) {
    return { success: false, error: 'A fejlesztési cél nem található' };
  }

  if (!user) {
    return { success: false, error: 'Nincs bejelentkezve' };
  }
  if (cel.dolgozo_id !== user.id) {
    const { requireHrAuthServer } = await import('@/utils/hr/hr-auth-guard');
    const auth = await requireHrAuthServer(['hr_munkatars', 'hr_vezeto', 'admin', 'vezeto'], null);
    if (!auth.authorized) {
      return { success: false, error: 'Nincs jogosultságod más dolgozó tanúsítványának feltöltéséhez.' };
    }
  }

  const companyId = cel.company_id || cel.hr_fejlesztesi_terv?.company_id || 'general';
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `idp/${companyId}/${cel.dolgozo_id}/${celId}_${timestamp}_${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await adminClient.storage
    .from('irat_files')
    .upload(storagePath, buffer, {
      contentType: file.type || 'application/pdf',
      upsert: true
    });

  if (uploadError) {
    console.error('Hiba a tanúsítvány feltöltésekor:', uploadError);
    return { success: false, error: 'Feltöltési hiba: ' + uploadError.message };
  }

  const { error: updateError } = await adminClient
    .from('hr_fejlesztesi_cel')
    .update({
      tanusitvany_url: storagePath,
      tanusitvany_nev: file.name,
      tanusitvany_feltoltve_at: new Date().toISOString(),
      statusz: 'jovahagyasra_var',
      updated_at: new Date().toISOString()
    })
    .eq('id', celId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  if (user) {
    const text = megjegyzes.trim()
      ? `Tanúsítvány csatolva (${file.name}): ${megjegyzes.trim()}`
      : `Tanúsítvány feltöltve jóváhagyásra (${file.name})`;
    await adminClient
      .from('hr_idp_megjegyzes')
      .insert([{
        cel_id: celId,
        szoveg: text,
        iro_id: user.id
      }]);
  }

  revalidatePath('/hr');
  revalidatePath('/hr/self-service/idp');
  revalidatePath(`/hr/employee/${cel.dolgozo_id}`);
  return { success: true };
}

export async function approveDevelopmentGoal(celId: string, megjegyzes?: string) {
  const { requireHrAuthServer } = await import('@/utils/hr/hr-auth-guard');
  const auth = await requireHrAuthServer(['hr_munkatars', 'hr_vezeto', 'admin', 'vezeto'], null);
  if (!auth.authorized || !auth.user) {
    return { success: false, error: 'Nincs jogosultságod a fejlesztési cél jóváhagyásához.' };
  }
  const user = auth.user;

  const { createClient: createAdminClient } = await import('@supabase/supabase-js');
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: cel, error: fetchError } = await adminClient
    .from('hr_fejlesztesi_cel')
    .select('*, hr_fejlesztesi_terv(company_id)')
    .eq('id', celId)
    .single();

  if (fetchError || !cel) {
    return { success: false, error: 'Cél nem található' };
  }

  const today = new Date().toISOString().split('T')[0];

  // 1. Képzettség rögzítése a dolgozó profiljához
  let kepzettsegId = cel.eredmeny_kepzettseg_id;
  if (!kepzettsegId && (cel.tipus === 'kepzes' || cel.tipus === 'nyelv')) {
    const { data: kepzettseg } = await adminClient
      .from('hr_kepzettseg')
      .insert([{
        dolgozo_id: cel.dolgozo_id,
        tipus: cel.tipus === 'kepzes' ? 'tanfolyam' : 'nyelvvizsga',
        megnevezes: cel.megnevezes,
        intezmeny: cel.intezmeny || 'Egyéni fejlesztési terv',
        megszerzes_datuma: today,
        dokumentum_url: cel.tanusitvany_url || null
      }])
      .select()
      .single();

    if (kepzettseg) {
      kepzettsegId = kepzettseg.id;
    }
  }

  // 2. Ha van feltöltött tanúsítvány, automatikusan rögzítjük a hr_dokumentum táblában is (valós oszlopnevekkel)
  if (cel.tanusitvany_url) {
    try {
      const companyId = cel.company_id || cel.hr_fejlesztesi_terv?.company_id || (await getActiveCompanyIdServer()) || null;
      await adminClient
        .from('hr_dokumentum')
        .insert([{
          dolgozo_id: cel.dolgozo_id,
          nev: `${cel.megnevezes} - Képzési tanúsítvány`,
          kategoria: 'Képzés / Tanúsítvány',
          url: cel.tanusitvany_url,
          ...(companyId ? { company_id: companyId } : {})
        }]);
    } catch (docErr) {
      console.warn('Nem sikerült a hr_dokumentum bejegyzés rögzítése:', docErr);
    }
  }

  // 3. Státusz frissítése: teljesitve
  const { error: updateError } = await adminClient
    .from('hr_fejlesztesi_cel')
    .update({
      statusz: 'teljesitve',
      teljesites_datuma: today,
      eredmeny_kepzettseg_id: kepzettsegId,
      elutasitas_indoklas: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', celId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // 4. Megjegyzés fűzése
  if (user) {
    await adminClient
      .from('hr_idp_megjegyzes')
      .insert([{
        cel_id: celId,
        szoveg: megjegyzes ? `Vezetői jóváhagyás megtörtént: ${megjegyzes}` : 'Vezetői jóváhagyás megtörtént. Képzés sikeresen igazolva.',
        iro_id: user.id
      }]);
  }

  revalidatePath('/hr');
  revalidatePath('/hr/self-service/idp');
  revalidatePath(`/hr/employee/${cel.dolgozo_id}`);
  return { success: true };
}

export async function rejectDevelopmentGoal(celId: string, indoklas: string) {
  const { requireHrAuthServer } = await import('@/utils/hr/hr-auth-guard');
  const auth = await requireHrAuthServer(['hr_munkatars', 'hr_vezeto', 'admin', 'vezeto'], null);
  if (!auth.authorized || !auth.user) {
    return { success: false, error: 'Nincs jogosultságod a fejlesztési cél elutasításához.' };
  }
  const user = auth.user;

  const { createClient: createAdminClient } = await import('@supabase/supabase-js');
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: cel } = await adminClient
    .from('hr_fejlesztesi_cel')
    .select('dolgozo_id')
    .eq('id', celId)
    .single();

  const { error } = await adminClient
    .from('hr_fejlesztesi_cel')
    .update({
      statusz: 'folyamatban',
      elutasitas_indoklas: indoklas,
      updated_at: new Date().toISOString()
    })
    .eq('id', celId);

  if (error) {
    return { success: false, error: error.message };
  }

  if (user) {
    await adminClient
      .from('hr_idp_megjegyzes')
      .insert([{
        cel_id: celId,
        szoveg: `Visszaküldve kiegészítésre: ${indoklas}`,
        iro_id: user.id
      }]);
  }

  revalidatePath('/hr');
  revalidatePath('/hr/self-service/idp');
  if (cel?.dolgozo_id) {
    revalidatePath(`/hr/employee/${cel.dolgozo_id}`);
  }
  return { success: true };
}

export async function getSignedCertificateUrl(storagePath: string) {
  if (!storagePath) return null;
  const { createClient: createAdminClient } = await import('@supabase/supabase-js');
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await adminClient.storage
    .from('irat_files')
    .createSignedUrl(storagePath, 3600);

  if (error || !data?.signedUrl) {
    console.error('Hiba az aláírt URL generálásakor:', error);
    return null;
  }
  return data.signedUrl;
}

// ---------------------------------------------------------------------------
// Mentor és Szerződés Lekérdezések
// ---------------------------------------------------------------------------

export async function getCompanyMentorsAction(companyId?: string) {
  const activeCompanyId = companyId || (await getActiveCompanyIdServer());

  const { createClient: createAdminClient } = await import('@supabase/supabase-js');
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const map = new Map<string, { id: string; nev: string; munkakor?: string }>();

  if (activeCompanyId) {
    // 1. Céghez tartozó jogviszonyok és munkakörök lekérése
    const { data: jogviszonyok } = await adminClient
      .from('hr_jogviszony')
      .select(`
        dolgozo_id,
        kilepes_datuma,
        felhasznalo_profil(id, nev, pozicio),
        hr_beosztas(
          hr_munkakor(megnevezes)
        )
      `)
      .eq('company_id', activeCompanyId)
      .order('kilepes_datuma', { ascending: false, nullsFirst: true });

    if (jogviszonyok) {
      for (const j of jogviszonyok as any[]) {
        const p = Array.isArray(j.felhasznalo_profil) ? j.felhasznalo_profil[0] : j.felhasznalo_profil;
        if (p?.id && p?.nev && !map.has(p.id)) {
          const beosztas = Array.isArray(j.hr_beosztas) ? j.hr_beosztas[0] : j.hr_beosztas;
          const mkObj = Array.isArray(beosztas?.hr_munkakor) ? beosztas.hr_munkakor[0] : beosztas?.hr_munkakor;
          const munkakor = mkObj?.megnevezes || p.pozicio || undefined;
          map.set(p.id, { id: p.id, nev: p.nev, munkakor });
        }
      }
    }

    // 2. Tagok a company_members táblából
    const { data: members } = await adminClient
      .from('company_members')
      .select('user_id')
      .eq('company_id', activeCompanyId);

    const userIds = (members || []).map((m: any) => m.user_id);
    if (userIds.length > 0) {
      const { data: profs } = await adminClient
        .from('felhasznalo_profil')
        .select('id, nev, pozicio')
        .in('id', userIds);

      if (profs) {
        for (const p of profs as any[]) {
          if (!map.has(p.id) && p.nev) {
            map.set(p.id, { id: p.id, nev: p.nev, munkakor: p.pozicio || undefined });
          }
        }
      }
    }
  }

  // Fallback ha nincs tag
  if (map.size === 0) {
    const supabase = await createClient();
    const { data: allProfs } = await supabase
      .from('felhasznalo_profil')
      .select('id, nev, pozicio')
      .order('nev');
    for (const p of (allProfs as any[] || [])) {
      if (p.nev) map.set(p.id, { id: p.id, nev: p.nev, munkakor: p.pozicio || undefined });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.nev.localeCompare(b.nev, 'hu'));
}

export async function getEmployeeStudyContractsAction(dolgozoId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('hr_tanulmanyi_szerzodes')
    .select('id, intezmeny_neve, kepzes_neve, szerzodes_szam')
    .eq('dolgozo_id', dolgozoId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Hiba a tanulmányi szerződések lekérésekor:', error);
    return [];
  }
  return data || [];
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
  revalidatePath('/hr/self-service/idp');
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
        mentor_profil:felhasznalo_profil(id, nev),
        tanulmanyi_szerzodes:hr_tanulmanyi_szerzodes(id, intezmeny_neve, kepzes_neve, szerzodes_szam),
        megjegyzesek:hr_idp_megjegyzes(*, iro:felhasznalo_profil(nev))
      )
    `)
    .eq('dolgozo_id', dolgozoId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Hiba az IDP lekérdezésekor:', error);
    return [];
  }
  return data || [];
}
