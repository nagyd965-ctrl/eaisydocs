import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { sendSmsNotification } from '@/utils/sms/twilio';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. Biztonsági ellenőrzés (CRON_SECRET)
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const secretQuery = searchParams.get('secret');
    const expectedSecret = process.env.CRON_SECRET || 'teszt-cron-kulcs-123';
    
    if (authHeader !== `Bearer ${expectedSecret}` && authHeader !== expectedSecret && secretQuery !== expectedSecret) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Admin szintű Supabase kliens
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 3. Mai dátum kezdetének és végének meghatározása (Magyar idő szerint)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 4. Lekérjük a mai interjúkat, akik kértek SMS-t
    const { data: interviews, error } = await adminClient
      .from('hr_toborzas')
      .select('id, nev, telefon, interju_idopont, interju_helyszin')
      .eq('statusz', 'interju')
      .eq('sms_emlekezteto_kerve', true)
      .gte('interju_idopont', todayStart.toISOString())
      .lte('interju_idopont', todayEnd.toISOString());

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
    for (const interview of interviews) {
      if (!interview.telefon) {
        results.push({ id: interview.id, status: 'skipped (no phone number)' });
        continue;
      }

      const interjuTime = new Date(interview.interju_idopont).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
      const helyszin = interview.interju_helyszin || 'a megbeszélt helyszínen';
      
      const smsBody = `Kedves ${interview.nev}! Emlékeztető: Ma ${interjuTime}-kor várjuk személyes interjúra a Think AI Kft.-nél. Cím/Link: ${helyszin}. Üdvözlettel: HR csapat`;

      const smsResult = await sendSmsNotification({
        to: interview.telefon,
        body: smsBody
      });

      results.push({ id: interview.id, name: interview.nev, phone: interview.telefon, smsResult });

      if (smsResult.success) {
        successCount++;
        // Naplózás
        await adminClient.from('hr_esemeny_naplo').insert({
          esemeny_tipus: 'rendszer_inditas', // Vagy ha van 'sms_kuldve' típus
          entitas_tipus: 'hr_toborzas',
          entitas_id: interview.id,
          megjegyzes: `Automatikus interjú SMS emlékeztető elküldve a ${interview.telefon} számra.`
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: interviews.length,
      sent: successCount,
      details: results
    });

  } catch (err: any) {
    console.error('Kritikus hiba a reggeli cron futásakor:', err);
    return new NextResponse(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
