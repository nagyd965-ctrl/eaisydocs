import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendNotificationEmail } from '@/utils/mailer';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. Biztonsági ellenőrzés (CRON_SECRET)
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET || 'teszt-cron-kulcs-123';
    
    if (authHeader !== `Bearer ${expectedSecret}` && authHeader !== expectedSecret) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Admin szintű Supabase kliens létrehozása (hogy lássuk az összes iratot és emailt)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new NextResponse('Missing Supabase configuration', { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Mai dátum előkészítése keresésekhez (00:00:00)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Két nap múlvai dátum (Határidő közeledik)
    const inTwoDays = new Date(today);
    inTwoDays.setDate(today.getDate() + 2);
    const inTwoDaysIsoStr = inTwoDays.toISOString().split('T')[0];
    const todayIsoStr = today.toISOString().split('T')[0];

    // Segédfüggvény email lekéréshez
    const getUserEmailById = async (userId: string) => {
      const { data } = await supabase.auth.admin.getUserById(userId);
      return data?.user?.email;
    };

    let emailsSent = 0;

    // 3. Értesítési Szabályok Lekérdezése
    const { data: szabalyok } = await supabase.from('ertesitesi_szabaly').select('*');

    if (!szabalyok) {
      return NextResponse.json({ message: 'Nincsenek beállított szabályok.' });
    }

    // =========================================================================
    // A) HATÁRIDŐ KÖZELEDIK (Felelősnek)
    // =========================================================================
    const kozeledikSzabaly = szabalyok.find(sz => sz.esemeny_tipus === 'hatarido_kozeledik' && sz.kinek === 'felelos' && sz.aktiv);
    if (kozeledikSzabaly) {
      const { data: ugyek } = await supabase
        .from('ugy')
        .select('id, targy, hatarido, felelos_user_id, ugyirat(id, iktatoszam)')
        .not('felelos_user_id', 'is', null)
        .eq('statusz', 'ugyintezes_alatt');

      if (ugyek) {
        for (const ugy of ugyek) {
          if (ugy.hatarido) {
            const ugyHatarido = new Date(ugy.hatarido).toISOString().split('T')[0];
            // Ha pontosan 2 nap múlva jár le
            if (ugyHatarido === inTwoDaysIsoStr && ugy.felelos_user_id && ugy.ugyirat && ugy.ugyirat.length > 0) {
              const email = await getUserEmailById(ugy.felelos_user_id);
              if (email) {
                await sendNotificationEmail({
                  to: email,
                  subject: `Határidő közeledik: ${ugy.ugyirat[0].iktatoszam}`,
                  html: `
                    <h2>Közelgő Határidő!</h2>
                    <p>A(z) <b>${ugy.ugyirat[0].iktatoszam}</b> azonosítójú ügyirat határideje 2 nap múlva lejár!</p>
                    <p><b>Tárgy:</b> ${ugy.targy}</p>
                    <p><b>Határidő:</b> ${ugy.hatarido}</p>
                    <p>Kérlek, időben gondoskodj az elintézésről!</p>
                  `,
                  dossierId: ugy.ugyirat[0].id
                });
                emailsSent++;
              }
            }
          }
        }
      }
    }

    // =========================================================================
    // B) HATÁRIDŐ LEJÁRT (Felelősnek és/vagy Vezetőnek)
    // =========================================================================
    const lejartFelelos = szabalyok.find(sz => sz.esemeny_tipus === 'hatarido_lejart' && sz.kinek === 'felelos' && sz.aktiv);
    const lejartVezeto = szabalyok.find(sz => sz.esemeny_tipus === 'hatarido_lejart' && sz.kinek === 'vezeto' && sz.aktiv);
    
    if (lejartFelelos || lejartVezeto) {
      const { data: lejartUgyek } = await supabase
        .from('ugy')
        .select('id, targy, hatarido, felelos_user_id, ugyirat(id, iktatoszam)')
        .not('felelos_user_id', 'is', null)
        .eq('statusz', 'ugyintezes_alatt');

      if (lejartUgyek) {
        for (const ugy of lejartUgyek) {
          if (ugy.hatarido) {
            const ugyHatarido = new Date(ugy.hatarido).toISOString().split('T')[0];
            // Ha a határidő régebbi, mint a mai nap
            if (ugyHatarido < todayIsoStr && ugy.ugyirat && ugy.ugyirat.length > 0) {
              
              // Értesítés a Felelősnek (Zargatás minden nap)
              if (lejartFelelos && ugy.felelos_user_id) {
                const email = await getUserEmailById(ugy.felelos_user_id);
                if (email) {
                  await sendNotificationEmail({
                    to: email,
                    subject: `Lejárt Határidő! - ${ugy.ugyirat[0].iktatoszam}`,
                    html: `
                      <h2 style="color: red;">Lejárt Határidő!</h2>
                      <p>Figyelem! A(z) <b>${ugy.ugyirat[0].iktatoszam}</b> azonosítójú ügyirattal késésben vagy!</p>
                      <p><b>Tárgy:</b> ${ugy.targy}</p>
                      <p><b>Eredeti határidő:</b> ${ugy.hatarido}</p>
                      <p>Kérlek, azonnal intézkedj!</p>
                    `,
                    dossierId: ugy.ugyirat[0].id
                  });
                  emailsSent++;
                }
              }

              // Értesítés a Vezetőnek (Eszkaláció)
              if (lejartVezeto) {
                const { data: vezetok } = await supabase.from('felhasznalo_profil').select('id').in('szerepkor', ['vezeto', 'admin', 'rendszergazda']);
                if (vezetok) {
                  for (const vezeto of vezetok) {
                    const vEmail = await getUserEmailById(vezeto.id);
                    if (vEmail) {
                      await sendNotificationEmail({
                        to: vEmail,
                        subject: `Eszkaláció: Lejárt határidejű ügyirat! - ${ugy.ugyirat[0].iktatoszam}`,
                        html: `
                          <h2 style="color: red;">Vezetői Eszkaláció</h2>
                          <p>Egy munkatárs kicsúszott a határidőből a(z) <b>${ugy.ugyirat[0].iktatoszam}</b> ügyirattal kapcsolatban.</p>
                          <p><b>Tárgy:</b> ${ugy.targy}</p>
                          <p><b>Lejárt határidő:</b> ${ugy.hatarido}</p>
                          <p>Kérlek, vizsgáld ki a késés okát!</p>
                        `
                      });
                      emailsSent++;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // =========================================================================
    // C) MEGŐRZÉSI IDŐ LEJÁRT (Iratkezelőnek)
    // =========================================================================
    const megorzesSzabaly = szabalyok.find(sz => sz.esemeny_tipus === 'megorzesi_ido_lejart' && sz.kinek === 'iratkezelo' && sz.aktiv);
    if (megorzesSzabaly) {
      // Itt az 'irat' táblát és a 'megorzesi_ido_vege' mezőt nézzük
      const { data: iratok } = await supabase
        .from('irat')
        .select('id, targy, erkeztetoszam, megorzesi_ido_vege, ugyirat_id')
        .not('megorzesi_ido_vege', 'is', null)
        .neq('statusz', 'selejtezett'); // Csak azokat, amik még nincsenek selejtezve

      if (iratok) {
        for (const irat of iratok) {
          const megorzesVege = new Date(irat.megorzesi_ido_vege).toISOString().split('T')[0];
          
          if (megorzesVege <= todayIsoStr) {
            const { data: iratkezelok } = await supabase.from('felhasznalo_profil').select('id').in('szerepkor', ['iktato', 'admin', 'rendszergazda']);
            if (iratkezelok) {
              for (const iratkezelo of iratkezelok) {
                const iktEmail = await getUserEmailById(iratkezelo.id);
                if (iktEmail) {
                  await sendNotificationEmail({
                    to: iktEmail,
                    subject: `Iratselejtezés esedékes: ${irat.erkeztetoszam || irat.targy}`,
                    html: `
                      <h2>Megőrzési idő lejárt!</h2>
                      <p>A törvényes megőrzési idő lejárt egy dokumentum esetében, így az <b>selejtezhetővé</b> vált.</p>
                      <p><b>Irat tárgya:</b> ${irat.targy}</p>
                      <p><b>Megőrzési idő vége:</b> ${irat.megorzesi_ido_vege}</p>
                      <p>Kérlek, indítsd el a selejtezési folyamatot az Irattár modulban!</p>
                    `,
                    dossierId: irat.ugyirat_id // Opcionális
                  });
                  emailsSent++;
                }
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Éjszakai rutinfeladatok lefutottak.', 
      emailsSent 
    });

  } catch (error: unknown) {
    console.error('CRON Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Belső szerverhiba';
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}
