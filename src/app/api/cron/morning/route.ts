import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { sendSmsNotification } from '@/utils/sms/twilio';

export const dynamic = 'force-dynamic';

/**
 * Kiszámítja a mai nap elejét és végét (00:00:00.000 – 23:59:59.999) Europe/Budapest időzónában,
 * UTC Date objektumokként a pontos adatbázis-szűréshez.
 */
function getBudapestTodayBoundsUtc(now = new Date()): { startIso: string; endIso: string; dateStr: string } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Budapest',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(now); // YYYY-MM-DD in Europe/Budapest

  // Determine Budapest UTC offset at noon on that date (+01:00 or +02:00)
  const probeUtc = new Date(`${dateStr}T12:00:00Z`);
  const budapestHourStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Budapest',
    hour: '2-digit',
    hour12: false,
  }).format(probeUtc);
  const offsetHours = parseInt(budapestHourStr, 10) - 12;
  const offsetSuffix = `${offsetHours >= 0 ? '+' : '-'}${String(Math.abs(offsetHours)).padStart(2, '0')}:00`;

  const startUtc = new Date(`${dateStr}T00:00:00.000${offsetSuffix}`);
  const endUtc = new Date(`${dateStr}T23:59:59.999${offsetSuffix}`);

  return {
    startIso: startUtc.toISOString(),
    endIso: endUtc.toISOString(),
    dateStr,
  };
}

export async function GET(request: Request) {
  try {
    // 1. Biztonsági ellenőrzés (CRON_SECRET — kizárólag fejléc-alapú timingSafeEqual)
    const { verifyCronAuth } = await import('@/utils/cron-auth');
    if (!verifyCronAuth(request)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Admin szintű Supabase kliens
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 3. Mai dátum kezdetének és végének meghatározása (Europe/Budapest idő szerint)
    const { startIso, endIso } = getBudapestTodayBoundsUtc();

    // 4. Lekérjük a mai interjúkat, akik kértek SMS-t (cégnévvel együtt)
    const { data: interviews, error } = await adminClient
      .from('hr_toborzas')
      .select(`
        id,
        nev,
        telefon,
        interju_idopont,
        interju_helyszin,
        company_id,
        companies:company_id ( name ),
        hr_allashirdetes ( company_id, companies:company_id ( name ) )
      `)
      .eq('statusz', 'interju')
      .eq('sms_emlekezteto_kerve', true)
      .gte('interju_idopont', startIso)
      .lte('interju_idopont', endIso);

    if (error) {
      console.error('Hiba az interjúk lekérésekor:', error);
      return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
    }

    if (!interviews || interviews.length === 0) {
      return NextResponse.json({ success: true, message: "Nincs mai interjús SMS feladat." });
    }

    let successCount = 0;
    const results = [];

    // 5. SMS-ek kiküldése
    for (const interview of interviews as any[]) {
      if (!interview.telefon) {
        results.push({ id: interview.id, status: 'skipped (no phone number)' });
        continue;
      }

      const interjuTime = new Date(interview.interju_idopont).toLocaleTimeString('hu-HU', {
        timeZone: 'Europe/Budapest',
        hour: '2-digit',
        minute: '2-digit',
      });
      const helyszin = interview.interju_helyszin || 'a megbeszélt helyszínen';

      const directComp = Array.isArray(interview.companies) ? interview.companies[0] : interview.companies;
      const posting = Array.isArray(interview.hr_allashirdetes) ? interview.hr_allashirdetes[0] : interview.hr_allashirdetes;
      const postingComp = Array.isArray(posting?.companies) ? posting?.companies[0] : posting?.companies;

      const resolvedCompanyId: string | null = interview.company_id || posting?.company_id || null;
      const companyName: string = directComp?.name || postingComp?.name || 'vállalatunk';

      const smsBody = `Kedves ${interview.nev}! Emlékeztető: Ma ${interjuTime}-kor várjuk interjúra (${companyName}). Cím/Link: ${helyszin}. Üdvözlettel: HR csapat`;

      const smsResult = await sendSmsNotification({
        to: interview.telefon,
        body: smsBody,
        subject: `Interjú SMS emlékeztető (${companyName})`,
        modul: 'hr',
        companyId: resolvedCompanyId || undefined,
      });

      results.push({ id: interview.id, name: interview.nev, phone: interview.telefon, smsResult });

      if (smsResult.success) {
        successCount++;
        // Naplózás a cég azonosítójával
        await adminClient.from('hr_esemeny_naplo').insert({
          esemeny_tipus: 'rendszer_inditas',
          entitas_tipus: 'hr_toborzas',
          entitas_id: interview.id,
          megjegyzes: `Automatikus interjú SMS emlékeztető elküldve a ${interview.telefon} számra (${companyName}).`,
          ...(resolvedCompanyId ? { company_id: resolvedCompanyId } : {}),
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: interviews.length,
      sent: successCount,
      details: results,
    });
  } catch (err: any) {
    console.error('Kritikus hiba a reggeli cron futásakor:', err);
    return new NextResponse(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
