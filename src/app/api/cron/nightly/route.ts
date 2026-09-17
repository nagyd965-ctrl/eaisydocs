import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { sendNotificationEmail, buildHtmlEmail } from '@/utils/mailer';
import { getBaseUrl } from '@/utils/url';
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

    // 2. Admin szintű Supabase kliens létrehozása (hogy lássuk az összes iratot és emailt)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new NextResponse('Missing Supabase configuration', { status: 500 });
    }

    const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Mai dátum előkészítése keresésekhez (00:00:00)
    const todayRaw = new Date();
    // Normalizáljuk éjfélre, hogy a manuális (délutáni) futtatásnál is pontos legyen a napok számítása
    const today = new Date(Date.UTC(todayRaw.getFullYear(), todayRaw.getMonth(), todayRaw.getDate()));
    const todayIsoStr = today.toISOString().split('T')[0];
    
    // Két nap múlvai dátum (Határidő közeledik)
    const inTwoDays = new Date(today);
    inTwoDays.setDate(today.getDate() + 2);
    const inTwoDaysIsoStr = inTwoDays.toISOString().split('T')[0];

    // Segédfüggvény email lekéréshez
    const getUserEmailById = async (userId: string) => {
      const { data } = await supabase.auth.admin.getUserById(userId);
      return data?.user?.email;
    };

    const getUserTelefonById = async (userId: string) => {
      const { data } = await supabase.from('felhasznalo_profil').select('telefon').eq('id', userId).single();
      return data?.telefon;
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
    const kozeledikSzabaly = szabalyok.find((sz: any) => sz.esemeny_tipus === 'hatarido_kozeledik' && sz.kinek === 'felelos' && sz.aktiv);
    if (kozeledikSzabaly) {
      const { data: ugyek } = await supabase
        .from('ugy')
        .select('id, targy, hatarido, felelos_user_id, ugyirat(id, iktatoszam, statusz)')
        .not('felelos_user_id', 'is', null)
        .eq('statusz', 'folyamatban');

      if (ugyek) {
        for (const ugy of ugyek) {
          if (ugy.hatarido) {
            const ugyHatarido = new Date(ugy.hatarido).toISOString().split('T')[0];
            const activeDossiers = (ugy.ugyirat || []).filter(
              (d: any) => !['elintezett', 'lezart', 'irattarban', 'selejtezheto'].includes(d.statusz)
            );
            if (activeDossiers.length === 0) continue;
            const primaryDossier = activeDossiers[0];

            // Ha pontosan 2 nap múlva jár le
            if (ugyHatarido === inTwoDaysIsoStr && ugy.felelos_user_id) {
              const csatornak = kozeledikSzabaly.csatorna || ['email'];
              if (csatornak.includes('email')) {
                const email = await getUserEmailById(ugy.felelos_user_id);
                if (email) {
                  await sendNotificationEmail({
                    to: email,
                    subject: `Határidő közeledik: ${primaryDossier.iktatoszam}`,
                    html: buildHtmlEmail(
                      "Közelgő Határidő!",
                      `A(z) <b>${primaryDossier.iktatoszam}</b> azonosítójú ügyirat határideje 2 nap múlva lejár! Kérlek, időben gondoskodj az elintézésről!`,
                      [
                        { label: "Tárgy", value: ugy.targy },
                        { label: "Határidő", value: ugy.hatarido }
                      ],
                      "Ügyirat megtekintése",
                      `${getBaseUrl()}/dossiers/${primaryDossier.id}`
                    ),
                    dossierId: primaryDossier.id
                  });
                  emailsSent++;
                }
              }
              
              if (csatornak.includes('in_app')) {
                await supabase.from('alkalmazas_ertesites').insert({
                  user_id: ugy.felelos_user_id, cim: `Határidő közeledik: ${primaryDossier.iktatoszam}`,
                  szoveg: `A(z) ${primaryDossier.iktatoszam} azonosítójú ügyirat határideje 2 nap múlva lejár!`,
                  link_url: `/dossiers/${primaryDossier.id}`
                });
              }

              if (csatornak.includes('sms')) {
                try {
                  const telefon = await getUserTelefonById(ugy.felelos_user_id);
                  if (telefon) {
                    await sendSmsNotification({
                      to: telefon,
                      body: `eaisyDocs: A(z) ${primaryDossier.iktatoszam} ügyirat határideje 2 nap múlva lejár!`,
                      subject: `Határidő közeledik: ${primaryDossier.iktatoszam}`,
                      dossierId: primaryDossier.id
                    });
                  }
                } catch (e) {
                  console.error("SMS hiba (hatarido_kozeledik):", e);
                }
              }
            }
          }
        }
      }
    }

    // =========================================================================
    // B) HATÁRIDŐ LEJÁRT (Felelősnek napi értesítés, 3 nap után Vezetői Eszkaláció)
    // =========================================================================
    const lejartSzabaly = szabalyok.find((sz: any) => sz.esemeny_tipus === 'hatarido_lejart' && sz.kinek === 'felelos' && sz.aktiv);
    const lejartFelettesSzabaly = szabalyok.find((sz: any) => sz.esemeny_tipus === 'hatarido_lejart' && (sz.kinek === 'vezeto' || sz.kinek === 'felettes') && sz.aktiv);
    
    if (lejartSzabaly || lejartFelettesSzabaly) {
      const { data: lejartUgyek } = await supabase
        .from('ugy')
        .select(`
          id, 
          targy, 
          hatarido, 
          felelos_user_id, 
          ugyirat(
            id, 
            iktatoszam, 
            statusz,
            szervezeti_egyseg_id, 
            szervezeti_egyseg(id, nev, vezeto_id)
          )
        `)
        .not('felelos_user_id', 'is', null)
        .eq('statusz', 'folyamatban');

      if (lejartUgyek) {
        for (const ugy of lejartUgyek) {
          if (ugy.hatarido) {
            const ugyHataridoDate = new Date(ugy.hatarido);
            const ugyHataridoStr = ugyHataridoDate.toISOString().split('T')[0];
            
            // Csak az aktív (nem elintézett, nem lezárt, nem irattározott) ügyiratokat vesszük figyelembe
            const activeDossiers = (ugy.ugyirat || []).filter(
              (d: any) => !['elintezett', 'lezart', 'irattarban', 'selejtezheto'].includes(d.statusz)
            );
            if (activeDossiers.length === 0) continue;

            // Ha a határidő régebbi, mint a mai nap
            if (ugyHataridoStr < todayIsoStr) {
              const dossier = activeDossiers[0];
              const diffTime = today.getTime() - new Date(ugyHataridoStr).getTime();
              const diffDays = Math.max(1, Math.floor(diffTime / (1000 * 3600 * 24)));
              
              // 1. Értesítés a Felelősnek (Napi zargatás lejárat után)
              if (lejartSzabaly && ugy.felelos_user_id) {
                const csatornak = lejartSzabaly.csatorna || ['email'];
                if (csatornak.includes('email')) {
                  const email = await getUserEmailById(ugy.felelos_user_id);
                  if (email) {
                    await sendNotificationEmail({
                      to: email,
                      subject: `Lejárt Határidő! (${diffDays} napja) - ${dossier.iktatoszam}`,
                      html: buildHtmlEmail(
                        "Lejárt Határidő!",
                        `Figyelem! A(z) <b>${dossier.iktatoszam}</b> azonosítójú ügyirattal <b>${diffDays} napja</b> késésben vagy! Kérlek, azonnal intézkedj!`,
                        [
                          { label: "Tárgy", value: ugy.targy },
                          { label: "Eredeti határidő", value: ugy.hatarido },
                          { label: "Késedelem", value: `${diffDays} nap` }
                        ],
                        "Azonnali intézkedés",
                        `${getBaseUrl()}/dossiers/${dossier.id}`
                      ),
                      dossierId: dossier.id
                    });
                    emailsSent++;
                  }
                }
                
                if (csatornak.includes('in_app')) {
                  await supabase.from('alkalmazas_ertesites').insert({
                    user_id: ugy.felelos_user_id, 
                    cim: `Lejárt Határidő! (${diffDays} napja) - ${dossier.iktatoszam}`,
                    szoveg: `A(z) ${dossier.iktatoszam} azonosítójú ügyirattal ${diffDays} napja késésben vagy!`,
                    link_url: `/dossiers/${dossier.id}`
                  });
                }

                if (csatornak.includes('sms')) {
                  try {
                    const telefon = await getUserTelefonById(ugy.felelos_user_id);
                    if (telefon) {
                      await sendSmsNotification({
                        to: telefon,
                        body: `eaisyDocs: A(z) ${dossier.iktatoszam} ügyirat határideje ${diffDays} napja lejárt! Kérlek, azonnal intézkedj!`,
                        subject: `Lejárt Határidő: ${dossier.iktatoszam}`,
                        dossierId: dossier.id
                      });
                    }
                  } catch (e) {
                    console.error("SMS hiba (hatarido_lejart - felelos):", e);
                  }
                }
              }

              // 2. Automatikus Eszkaláció a Szervezeti Egység Vezetőjéhez (3 nap túllépés után)
              if (lejartFelettesSzabaly && diffDays >= 3) {
                const csatornakVezeto = lejartFelettesSzabaly.csatorna || ['email'];
                
                // Szervezeti egység és kijelölt vezető feloldása
                const orgUnit = Array.isArray(dossier.szervezeti_egyseg) ? dossier.szervezeti_egyseg[0] : dossier.szervezeti_egyseg;
                let targetLeaderIds: string[] = [];

                if (orgUnit?.vezeto_id) {
                  // Elsődleges: a szervezeti egység kijelölt vezetője
                  targetLeaderIds.push(orgUnit.vezeto_id);
                } else if (orgUnit?.id) {
                  // 1. Fallback: az adott szervezeti egység 'vezeto' szerepkörű tagjai
                  const { data: deptManagers } = await supabase
                    .from('felhasznalo_profil')
                    .select('id')
                    .eq('szervezeti_egyseg_id', orgUnit.id)
                    .eq('docs_szerepkor', 'vezeto');
                  
                  if (deptManagers && deptManagers.length > 0) {
                    targetLeaderIds = deptManagers.map((m: any) => m.id);
                  }
                }

                // 2. Fallback: ha nincs kijelölt vezető, a globális adminok/rendszergazdák kapják
                if (targetLeaderIds.length === 0) {
                  const { data: adminUsers } = await supabase
                    .from('felhasznalo_profil')
                    .select('id')
                    .in('docs_szerepkor', ['admin', 'rendszergazda']);
                  
                  if (adminUsers && adminUsers.length > 0) {
                    targetLeaderIds = adminUsers.map((a: any) => a.id);
                  }
                }

                // Kizárjuk a felelőst, ha ő maga lenne a vezető és van más elérhető vezető/admin
                const filteredLeaders = targetLeaderIds.filter(id => id !== ugy.felelos_user_id);
                const finalLeaderIds = filteredLeaders.length > 0 ? filteredLeaders : targetLeaderIds;

                for (const leaderId of finalLeaderIds) {
                  if (csatornakVezeto.includes('email')) {
                    const vEmail = await getUserEmailById(leaderId);
                    if (vEmail) {
                      await sendNotificationEmail({
                        to: vEmail,
                        subject: `[ESZKALÁCIÓ] ${diffDays} napos határidő-túllépés! - ${dossier.iktatoszam}`,
                        html: buildHtmlEmail(
                          "Vezetői Eszkaláció",
                          `Figyelem! A szervezeti egység egyik munkatársa <b>${diffDays} napos késedelembe</b> esett a(z) <b>${dossier.iktatoszam}</b> ügyirattal kapcsolatban. Kérlek, vizsgáld ki a késés okát és tegyél intézkedést!`,
                          [
                            { label: "Ügyirat", value: dossier.iktatoszam },
                            { label: "Tárgy", value: ugy.targy },
                            { label: "Eredeti határidő", value: ugy.hatarido },
                            { label: "Késés mértéke", value: `${diffDays} nap` },
                            { label: "Szervezeti egység", value: orgUnit?.nev || "Nincs megadva" }
                          ],
                          "Ügyirat megtekintése",
                          `${getBaseUrl()}/dossiers/${dossier.id}`
                        ),
                        dossierId: dossier.id
                      });
                      emailsSent++;
                    }
                  }

                  if (csatornakVezeto.includes('in_app')) {
                    await supabase.from('alkalmazas_ertesites').insert({
                      user_id: leaderId,
                      cim: `[ESZKALÁCIÓ] ${diffDays} napos késés: ${dossier.iktatoszam}`,
                      szoveg: `A(z) ${dossier.iktatoszam} azonosítójú ügyirat határideje ${diffDays} napja lejárt (${orgUnit?.nev || 'Általános'}).`,
                      link_url: `/dossiers/${dossier.id}`
                    });
                  }

                  if (csatornakVezeto.includes('sms')) {
                    try {
                      const telefon = await getUserTelefonById(leaderId);
                      if (telefon) {
                        await sendSmsNotification({
                          to: telefon,
                          body: `eaisyDocs Eszkaláció: ${diffDays} napos késés a(z) ${dossier.iktatoszam} ügyiratnál! Ellenőrizd a rendszerben!`,
                          subject: `Eszkaláció: ${dossier.iktatoszam}`,
                          dossierId: dossier.id
                        });
                      }
                    } catch (e) {
                      console.error("SMS hiba (eszkalacio):", e);
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
    const lejaratSzabaly = szabalyok.find((sz: any) => sz.esemeny_tipus === 'megorzes_lejar' && sz.kinek === 'iratkezelo' && sz.aktiv);
    if (lejaratSzabaly) {
      // Az ugyirat táblát és a 'megorzesi_ido_vege' mezőt figyeljük (lezárt/irattározott státuszúaknál)
      const { data: ugyiratok } = await supabase
        .from('ugyirat')
        .select('id, iktatoszam, megorzesi_ido_vege, statusz, ugy:ugy_id(targy)')
        .not('megorzesi_ido_vege', 'is', null)
        .in('statusz', ['lezart', 'irattarban']);

      if (ugyiratok) {
        for (const ugyirat of ugyiratok) {
          const megorzesVege = new Date(ugyirat.megorzesi_ido_vege).toISOString().split('T')[0];
          
          if (megorzesVege <= todayIsoStr) {
            const { data: iratkezelok } = await supabase.from('felhasznalo_profil').select('id').in('szerepkor', ['iktato', 'admin', 'rendszergazda']);
            if (iratkezelok) {
              const targy = Array.isArray(ugyirat.ugy) ? (ugyirat.ugy[0] as any)?.targy : (ugyirat.ugy as any)?.targy || 'Ismeretlen ügy';
              for (const iratkezelo of iratkezelok) {
                const iktEmail = await getUserEmailById(iratkezelo.id);
                if (iktEmail) {
                  await sendNotificationEmail({
                    to: iktEmail,
                    subject: `Iratselejtezés esedékes: ${ugyirat.iktatoszam}`,
                    html: buildHtmlEmail(
                      "Megőrzési idő lejárt!",
                      "A törvényes megőrzési idő lejárt egy ügyirat esetében, így az <b>selejtezhetővé</b> vált. Kérlek, indítsd el a selejtezési folyamatot az Irattár modulban!",
                      [
                        { label: "Iktatószám", value: ugyirat.iktatoszam },
                        { label: "Ügy tárgya", value: targy },
                        { label: "Megőrzési idő vége", value: ugyirat.megorzesi_ido_vege }
                      ],
                      "Irattár megnyitása",
                      `${getBaseUrl()}/archive`
                    ),
                    dossierId: ugyirat.id
                  });
                  emailsSent++;
                }
              }
            }
          }
        }
      }
    }

    // =========================================================================
    // D) HR: ORVOSI VIZSGÁLAT LEJÁRATA (30 és 7 nap)
    // =========================================================================
    const orvosiSzabaly = szabalyok.find((sz: any) => sz.esemeny_tipus === 'orvosi_vizsgalat_lejarat' && sz.aktiv);
    if (orvosiSzabaly) {
      const { data: vizsgalatok } = await supabase
        .from('hr_orvosi_vizsgalat')
        .select('id, ervenyesseg_datuma, dolgozo_id, hr_dolgozo_adatlap!inner(id, felhasznalo_profil!inner(nev, hr_szerepkor))')
        .not('ervenyesseg_datuma', 'is', null);

      if (vizsgalatok) {
        for (const v of vizsgalatok) {
          const lejarat = new Date(v.ervenyesseg_datuma);
          const diffDays = Math.ceil((lejarat.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const dolgozoNev = (v.hr_dolgozo_adatlap as any).felhasznalo_profil.nev;

          if (diffDays === 30 || diffDays === 7 || diffDays <= 0) {
            const csatornak = orvosiSzabaly.csatorna || [];
            const kinek = orvosiSzabaly.kinek || '';
            const targetUserIds: string[] = [];

            if (kinek.includes('Érintett')) targetUserIds.push(v.dolgozo_id);
            if (kinek.includes('HR')) {
              const { data: hrUsers } = await supabase.from('felhasznalo_profil').select('id').in('hr_szerepkor', ['hr_munkatars', 'hr_vezeto']);
              if (hrUsers) targetUserIds.push(...hrUsers.map((u: any) => u.id));
            }
            
            const isExpired = diffDays <= 0;
            const notificationTitle = isExpired ? 'Lejárt orvosi alkalmasság!' : 'Orvosi alkalmasság lejárata';
            const notificationText = isExpired 
              ? `${dolgozoNev} orvosi alkalmassága már ${Math.abs(diffDays)} napja lejárt (${v.ervenyesseg_datuma})!`
              : `${dolgozoNev} orvosi alkalmassága ${diffDays} nap múlva lejár (${v.ervenyesseg_datuma}).`;

            for (const targetId of Array.from(new Set(targetUserIds))) {
              if (csatornak.includes('in_app')) {
                await supabase.from('alkalmazas_ertesites').insert({
                  user_id: targetId, cim: notificationTitle,
                  szoveg: notificationText,
                  link_url: '/hr/self-service'
                });
              }
              if (csatornak.includes('email')) {
                const email = await getUserEmailById(targetId);
                if (email) {
                  await sendNotificationEmail({
                    to: email, subject: `${notificationTitle}: ${dolgozoNev}`,
                    html: buildHtmlEmail(notificationTitle, notificationText, [{ label: "Lejárat", value: v.ervenyesseg_datuma }], "Profil megtekintése", `${getBaseUrl()}/hr`)
                  });
                  emailsSent++;
                }
              }
              if (csatornak.includes('sms')) {
                try {
                  const { data: targetProfile } = await supabase.from("felhasznalo_profil").select("telefon").eq("id", targetId).maybeSingle();
                  if (targetProfile?.telefon) {
                    const { sendSmsNotification } = await import('@/utils/sms/twilio');
                    await sendSmsNotification({
                      to: targetProfile.telefon,
                      body: `eaisyHR: ${notificationText}`
                    });
                  }
                } catch (e) {
                  console.error("Failed to send orvosi lejarat sms", e);
                }
              }
            }
          }
        }
      }
    }

    // =========================================================================
    // E) HR: PRÓBAIDŐ LEJÁRATA (7 nap)
    // =========================================================================
    const probaidoSzabaly = szabalyok.find((sz: any) => sz.esemeny_tipus === 'probaido_lejarat' && sz.aktiv);
    if (probaidoSzabaly) {
      const { data: jogviszonyok } = await supabase
        .from('hr_jogviszony')
        .select('id, dolgozo_id, probaido_vege, hr_dolgozo_adatlap(id, felhasznalo_profil!inner(nev, kozvetlen_vezeto_id))')
        .not('probaido_vege', 'is', null);

      if (jogviszonyok) {
        for (const jv of jogviszonyok) {
          const lejarat = new Date(jv.probaido_vege);
          const diffDays = Math.ceil((lejarat.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 7) {
            const csatornak = probaidoSzabaly.csatorna || [];
            const kinek = probaidoSzabaly.kinek || '';
            const targetUserIds: string[] = [];

            if (kinek.includes('HR')) {
              const { data: hrUsers } = await supabase.from('felhasznalo_profil').select('id').in('hr_szerepkor', ['hr_munkatars', 'hr_vezeto', 'admin']);
              if (hrUsers) targetUserIds.push(...hrUsers.map((u: any) => u.id));
            }
            if (kinek.includes('Vezető')) {
              const prof = (jv.hr_dolgozo_adatlap as any)?.felhasznalo_profil;
              const vezetoId = Array.isArray(prof) ? prof[0]?.kozvetlen_vezeto_id : prof?.kozvetlen_vezeto_id;
              if (vezetoId) {
                targetUserIds.push(vezetoId);
              }
            }

            for (const targetId of Array.from(new Set(targetUserIds))) {
              if (csatornak.includes('in_app')) {
                const prof = (jv.hr_dolgozo_adatlap as any)?.felhasznalo_profil;
                const dolgozoNev = Array.isArray(prof) ? prof[0]?.nev : prof?.nev;
                await supabase.from('alkalmazas_ertesites').insert({
                  user_id: targetId, cim: 'Próbaidő lejárata',
                  szoveg: `${dolgozoNev} próbaideje 7 nap múlva lejár.`,
                  link_url: '/hr'
                });
              }
              if (csatornak.includes('email')) {
                const email = await getUserEmailById(targetId);
                if (email) {
                  const prof = (jv.hr_dolgozo_adatlap as any)?.felhasznalo_profil;
                  const dolgozoNev = Array.isArray(prof) ? prof[0]?.nev : prof?.nev;
                  await sendNotificationEmail({
                    to: email, subject: `Próbaidő lejárata: ${dolgozoNev}`,
                    html: buildHtmlEmail("Próbaidő lejárata közeledik", `${dolgozoNev} próbaideje 7 nap múlva lejár!`, [{ label: "Próbaidő vége", value: jv.probaido_vege }], "Profil megtekintése", `${getBaseUrl()}/hr`)
                  });
                  emailsSent++;
                }
              }
              if (csatornak.includes('sms')) {
                const telefon = await getUserTelefonById(targetId);
                if (telefon) {
                  const prof = (jv.hr_dolgozo_adatlap as any)?.felhasznalo_profil;
                  const dolgozoNev = Array.isArray(prof) ? prof[0]?.nev : prof?.nev;
                  await sendSmsNotification({
                    to: telefon,
                    body: `eaisyHR Emlékeztető: ${dolgozoNev} próbaideje 7 nap múlva lejár (${jv.probaido_vege})!`
                  });
                }
              }
            }
          }
        }
      }
    }

    // =========================================================================
    // F) HR: T1041 BEJELENTÉS (2 nap)
    // =========================================================================
    const t1041Szabaly = szabalyok.find((sz: any) => sz.esemeny_tipus === 't1041_bejelentes' && sz.aktiv);
    if (t1041Szabaly) {
      const { data: jogviszonyok, error } = await supabase
        .from('hr_jogviszony')
        .select('id, belepes_datuma, hr_dolgozo_adatlap(id, felhasznalo_profil!inner(nev))')
        .not('belepes_datuma', 'is', null);

      if (error) console.error("T1041 Query Error:", error);

      if (jogviszonyok) {
        for (const jv of jogviszonyok) {
          const belepes = new Date(jv.belepes_datuma);
          const diffDays = Math.ceil((belepes.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 2) {
            const csatornak = t1041Szabaly.csatorna || [];
            const targetUserIds: string[] = [];
            const { data: hrUsers } = await supabase.from('felhasznalo_profil').select('id').in('hr_szerepkor', ['hr_munkatars', 'hr_vezeto', 'admin']);
            if (hrUsers) targetUserIds.push(...hrUsers.map((u: any) => u.id));

            for (const targetId of Array.from(new Set(targetUserIds))) {
              const prof = (jv.hr_dolgozo_adatlap as any)?.felhasznalo_profil;
              const dolgozoNev = Array.isArray(prof) ? prof[0]?.nev : prof?.nev;

              if (csatornak.includes('in_app')) {
                await supabase.from('alkalmazas_ertesites').insert({
                  user_id: targetId, cim: 'T1041 Bejelentés Szükséges',
                  szoveg: `${dolgozoNev} 2 nap múlva munkába áll! Ne felejtsd el a T1041 bejelentést!`,
                  link_url: '/hr'
                });
              }
              if (csatornak.includes('email')) {
                const email = await getUserEmailById(targetId);
                if (email) {
                  await sendNotificationEmail({
                    to: email, subject: `T1041 Bejelentés szükséges: ${dolgozoNev}`,
                    html: buildHtmlEmail("T1041 Bejelentés", `Kérjük, győződj meg róla, hogy megtörtént a T1041 bejelentés!`, [{ label: "Belépés dátuma", value: jv.belepes_datuma }], "Tovább", `${getBaseUrl()}/hr`)
                  });
                  emailsSent++;
                }
              }
            }
          }
        }
      }
    }
    // =========================================================================
    // G) HR: TANULMÁNYI SZERZŐDÉS LEJÁRAT (30 nap, 7 nap, lejárt)
    // =========================================================================
    const tanulmanyiSzabaly = szabalyok.find((sz: any) => sz.esemeny_tipus === 'tanulmanyi_szerzodes_lejarat' && sz.aktiv);
    if (tanulmanyiSzabaly) {
      const { data: szerzodesek, error } = await supabase
        .from('hr_tanulmanyi_szerzodes')
        .select('id, dolgozo_id, kepzes_neve, lejarat_datuma, hr_dolgozo_adatlap(id, felhasznalo_profil!inner(nev))')
        .not('lejarat_datuma', 'is', null);

      if (error) console.error("Tanulmányi szerződés Query Error:", error);

      if (szerzodesek) {
        for (const sz of szerzodesek) {
          const lejarat = new Date(sz.lejarat_datuma);
          const diffDays = Math.ceil((lejarat.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 30 || diffDays === 7 || diffDays <= 0) {
            const csatornak = tanulmanyiSzabaly.csatorna || [];
            const targetUserIds: string[] = [];
            
            // HR címzettek lekérése
            const { data: hrUsers } = await supabase.from('felhasznalo_profil').select('id').in('hr_szerepkor', ['hr_munkatars', 'hr_vezeto', 'admin']);
            if (hrUsers) targetUserIds.push(...hrUsers.map((u: any) => u.id));

            // Érintett hozzáadása
            if (sz.dolgozo_id) targetUserIds.push(sz.dolgozo_id);

            for (const targetId of Array.from(new Set(targetUserIds))) {
              const prof = (sz.hr_dolgozo_adatlap as any)?.felhasznalo_profil;
              const dolgozoNev = Array.isArray(prof) ? prof[0]?.nev : prof?.nev;
              const title = diffDays <= 0 ? 'Lejárt tanulmányi szerződés!' : 'Tanulmányi szerződés lejárata közeledik';
              const text = diffDays <= 0 
                ? `${dolgozoNev} "${sz.kepzes_neve}" tanulmányi szerződése lejárt (${sz.lejarat_datuma})!` 
                : `${dolgozoNev} "${sz.kepzes_neve}" tanulmányi szerződése ${diffDays} nap múlva lejár!`;

              if (csatornak.includes('in_app')) {
                await supabase.from('alkalmazas_ertesites').insert({
                  user_id: targetId, cim: title,
                  szoveg: text,
                  link_url: '/hr'
                });
              }
              if (csatornak.includes('email')) {
                const email = await getUserEmailById(targetId);
                if (email) {
                  await sendNotificationEmail({
                    to: email, subject: `${title}: ${dolgozoNev}`,
                    html: buildHtmlEmail(title, text, [{ label: "Lejárat dátuma", value: sz.lejarat_datuma }, { label: "Képzés neve", value: sz.kepzes_neve }], "Profil megtekintése", `${getBaseUrl()}/hr`)
                  });
                  emailsSent++;
                }
              }
              if (csatornak.includes('sms')) {
                try {
                  const { data: targetProfile } = await supabase.from("felhasznalo_profil").select("telefon").eq("id", targetId).maybeSingle();
                  if (targetProfile?.telefon) {
                    const { sendSmsNotification } = await import('@/utils/sms/twilio');
                    await sendSmsNotification({
                      to: targetProfile.telefon,
                      body: `eaisyHR: ${text}`
                    });
                  }
                } catch (e) {
                  console.error("Failed to send tanulmanyi lejarat sms", e);
                }
              }
            }
          }
        }
      }
    }
    // =========================================================================
    // H) HR: HATÁROZOTT IDEJŰ SZERZŐDÉS LEJÁRAT (15 nap)
    // =========================================================================
    const hatarozottSzabaly = szabalyok.find((sz: any) => sz.esemeny_tipus === 'hatarozott_szerzodes_lejarat' && sz.aktiv);
    if (hatarozottSzabaly) {
      const { data: jogviszonyok, error } = await supabase
        .from('hr_jogviszony')
        .select('id, kilepes_datuma, hr_dolgozo_adatlap(id, felhasznalo_profil!inner(nev)), hr_beosztas(kozvetlen_vezeto)')
        .not('kilepes_datuma', 'is', null);

      if (error) console.error("Határozott idejű szerződés Query Error:", error);

      if (jogviszonyok) {
        for (const jv of jogviszonyok) {
          const lejarat = new Date(jv.kilepes_datuma);
          const diffDays = Math.ceil((lejarat.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 15) {
            const csatornak = hatarozottSzabaly.csatorna || [];
            const targetUserIds: string[] = [];
            
            // HR címzettek lekérése (alapértelmezés)
            const { data: hrUsers } = await supabase.from('felhasznalo_profil').select('id').in('hr_szerepkor', ['hr_munkatars', 'hr_vezeto', 'admin']);
            if (hrUsers) targetUserIds.push(...hrUsers.map((u: any) => u.id));

            const adatlap = jv.hr_dolgozo_adatlap as any;
            const prof = adatlap?.felhasznalo_profil;
            const dolgozoNev = Array.isArray(prof) ? prof[0]?.nev : prof?.nev;
            
            const beosztasok = jv.hr_beosztas as any[];
            const kozvetlenVezeto = beosztasok && beosztasok.length > 0 ? beosztasok[0].kozvetlen_vezeto : null;

            // Vezető lekérése név alapján, ha kérik a vezetőt is a címzettek között
            if (hatarozottSzabaly.kinek?.includes('Vezető') && kozvetlenVezeto) {
               const vezetoNevDb = kozvetlenVezeto;
               const { data: vezetoProfil } = await supabase.from('felhasznalo_profil').select('id').ilike('nev', vezetoNevDb).single();
               if (vezetoProfil) targetUserIds.push(vezetoProfil.id);
            }

            for (const targetId of Array.from(new Set(targetUserIds))) {
              const title = 'Lejáró határozott idejű szerződés';
              const text = `${dolgozoNev} határozott idejű szerződése (jogviszonya) 15 nap múlva lejár (${jv.kilepes_datuma})! Kérjük, egyeztessétek a hosszabbítást!`;

              if (csatornak.includes('in_app')) {
                await supabase.from('alkalmazas_ertesites').insert({
                  user_id: targetId, cim: title,
                  szoveg: text,
                  link_url: '/hr'
                });
              }
              if (csatornak.includes('email')) {
                const email = await getUserEmailById(targetId);
                if (email) {
                  await sendNotificationEmail({
                    to: email, subject: `${title}: ${dolgozoNev}`,
                    html: buildHtmlEmail(title, text, [{ label: "Szerződés vége", value: jv.kilepes_datuma }], "Profil megtekintése", `${getBaseUrl()}/hr`)
                  });
                  emailsSent++;
                }
              }
              if (csatornak.includes('sms')) {
                try {
                  const { data: targetProfile } = await supabase.from("felhasznalo_profil").select("telefon").eq("id", targetId).maybeSingle();
                  if (targetProfile?.telefon) {
                    const { sendSmsNotification } = await import('@/utils/sms/twilio');
                    await sendSmsNotification({
                      to: targetProfile.telefon,
                      body: `eaisyHR: ${text}`
                    });
                  }
                } catch (e) {
                  console.error("Failed to send hatarozott_szerzodes_lejarat sms", e);
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
