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
    const expectedSecret = process.env.CRON_SECRET;
    
    if (!expectedSecret || (authHeader !== `Bearer ${expectedSecret}` && authHeader !== expectedSecret && secretQuery !== expectedSecret)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Admin szintű Supabase kliens létrehozása
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
    const today = new Date(Date.UTC(todayRaw.getFullYear(), todayRaw.getMonth(), todayRaw.getDate()));
    const todayIsoStr = today.toISOString().split('T')[0];
    
    // Két nap múlvai dátum (Határidő közeledik)
    const inTwoDays = new Date(today);
    inTwoDays.setDate(today.getDate() + 2);
    const inTwoDaysIsoStr = inTwoDays.toISOString().split('T')[0];

    // Segédfüggvény email lekéréshez (Auth email + hr_dolgozo_adatlap fallback)
    const getUserEmailById = async (userId: string): Promise<string | undefined> => {
      const { data } = await supabase.auth.admin.getUserById(userId);
      if (data?.user?.email) return data.user.email;
      const { data: adatlap } = await supabase
        .from('hr_dolgozo_adatlap')
        .select('email')
        .eq('id', userId)
        .maybeSingle();
      return adatlap?.email || undefined;
    };

    // Segédfüggvény telefonszám lekéréshez (felhasznalo_profil.telefon + hr_dolgozo_adatlap.telefonszam fallback)
    const getUserTelefonById = async (userId: string): Promise<string | undefined> => {
      const { data: prof } = await supabase
        .from('felhasznalo_profil')
        .select('telefon')
        .eq('id', userId)
        .maybeSingle();
      if (prof?.telefon) return prof.telefon;

      const { data: adatlap } = await supabase
        .from('hr_dolgozo_adatlap')
        .select('telefonszam')
        .eq('id', userId)
        .maybeSingle();
      return adatlap?.telefonszam || undefined;
    };

    let emailsSent = 0;

    // 3. Értesítési Szabályok Lekérdezése
    const { data: szabalyok } = await supabase.from('ertesitesi_szabaly').select('*');

    if (!szabalyok || szabalyok.length === 0) {
      return NextResponse.json({ message: 'Nincsenek beállított szabályok.' });
    }

    /**
     * Cég-szintű szabálykereső:
     * Először az adott `companyId`-hoz tartozó szabályt keresi.
     * Ha van a céghez szabály és `aktiv === false`, akkor `null`-t ad vissza (nem esik vissza másik cég szabályára!).
     * Ha a céghez még nincs saját sor a táblában, visszaesik a `company_id IS NULL` (vagy első) szabályra.
     */
    const findRuleForCompany = (
      esemenyTipus: string | string[],
      companyId?: string | null,
      kinekMatch?: (kinek: string) => boolean
    ): any | null => {
      const types = Array.isArray(esemenyTipus) ? esemenyTipus : [esemenyTipus];
      const matchesTypeAndKinek = (sz: any) =>
        types.includes(sz.esemeny_tipus) && (!kinekMatch || kinekMatch(sz.kinek || ''));

      if (companyId) {
        const companyRule = szabalyok.find(
          (sz: any) => matchesTypeAndKinek(sz) && sz.company_id === companyId
        );
        if (companyRule) {
          return companyRule.aktiv ? companyRule : null;
        }
      }

      const globalRule =
        szabalyok.find((sz: any) => matchesTypeAndKinek(sz) && !sz.company_id) ||
        (!companyId ? szabalyok.find((sz: any) => matchesTypeAndKinek(sz)) : null);

      return globalRule && globalRule.aktiv ? globalRule : null;
    };

    const hasAnyActiveRule = (esemenyTipus: string | string[]): boolean => {
      const types = Array.isArray(esemenyTipus) ? esemenyTipus : [esemenyTipus];
      return szabalyok.some((sz: any) => types.includes(sz.esemeny_tipus) && sz.aktiv);
    };

    // Cég-szintű HR / Admin címzettek feloldása (company_members + felhasznalo_profil)
    const hrUsersCache = new Map<string, string[]>();
    const getCompanyHrUserIds = async (companyId?: string | null): Promise<string[]> => {
      const cacheKey = companyId || '__global__';
      if (hrUsersCache.has(cacheKey)) return hrUsersCache.get(cacheKey)!;

      const ids = new Set<string>();
      if (companyId) {
        const { data: members } = await supabase
          .from('company_members')
          .select('user_id, role, hr_szerepkor')
          .eq('company_id', companyId);

        for (const m of members || []) {
          if (
            m.role === 'admin' ||
            ['admin', 'rendszergazda', 'hr_vezeto', 'hr_munkatars'].includes(m.hr_szerepkor || '')
          ) {
            ids.add(m.user_id);
          }
        }

        const { data: profiles } = await supabase
          .from('felhasznalo_profil')
          .select('id')
          .eq('company_id', companyId)
          .in('hr_szerepkor', ['hr_munkatars', 'hr_vezeto', 'admin', 'rendszergazda']);

        for (const p of profiles || []) {
          ids.add(p.id);
        }
      }

      if (ids.size === 0) {
        const { data: globalHr } = await supabase
          .from('felhasznalo_profil')
          .select('id')
          .in('hr_szerepkor', ['hr_munkatars', 'hr_vezeto', 'admin', 'rendszergazda']);
        for (const p of globalHr || []) {
          ids.add(p.id);
        }
      }

      const result = Array.from(ids);
      hrUsersCache.set(cacheKey, result);
      return result;
    };

    // Cég-szintű Docs Iratkezelők feloldása
    const docsIratkezelokCache = new Map<string, string[]>();
    const getCompanyIratkezelokIds = async (companyId?: string | null): Promise<string[]> => {
      const cacheKey = companyId || '__global__';
      if (docsIratkezelokCache.has(cacheKey)) return docsIratkezelokCache.get(cacheKey)!;

      const ids = new Set<string>();
      if (companyId) {
        const { data: members } = await supabase
          .from('company_members')
          .select('user_id, role, docs_szerepkor')
          .eq('company_id', companyId);

        for (const m of members || []) {
          if (
            m.role === 'admin' ||
            ['iktato', 'admin', 'rendszergazda'].includes(m.docs_szerepkor || '')
          ) {
            ids.add(m.user_id);
          }
        }

        const { data: profiles } = await supabase
          .from('felhasznalo_profil')
          .select('id')
          .eq('company_id', companyId)
          .or('docs_szerepkor.in.(iktato,admin,rendszergazda),szerepkor.in.(iktato,admin,rendszergazda)');

        for (const p of profiles || []) {
          ids.add(p.id);
        }
      }

      if (ids.size === 0) {
        const { data: globalIktatok } = await supabase
          .from('felhasznalo_profil')
          .select('id')
          .or('docs_szerepkor.in.(iktato,admin,rendszergazda),szerepkor.in.(iktato,admin,rendszergazda)');
        for (const p of globalIktatok || []) {
          ids.add(p.id);
        }
      }

      const result = Array.from(ids);
      docsIratkezelokCache.set(cacheKey, result);
      return result;
    };

    // =========================================================================
    // A) HATÁRIDŐ KÖZELEDIK (Felelősnek)
    // =========================================================================
    if (hasAnyActiveRule('hatarido_kozeledik')) {
      const { data: ugyek } = await supabase
        .from('ugy')
        .select('id, company_id, targy, hatarido, felelos_user_id, ugyirat(id, iktatoszam, statusz, company_id)')
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
            const recordCompanyId = primaryDossier.company_id || (ugy as any).company_id || null;

            const kozeledikSzabaly = findRuleForCompany(
              'hatarido_kozeledik',
              recordCompanyId,
              (k) => k === 'felelos'
            );
            if (!kozeledikSzabaly) continue;

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
                    dossierId: primaryDossier.id,
                    companyId: recordCompanyId || undefined,
                  });
                  emailsSent++;
                }
              }
              
              if (csatornak.includes('in_app')) {
                await supabase.from('alkalmazas_ertesites').insert({
                  user_id: ugy.felelos_user_id,
                  cim: `Határidő közeledik: ${primaryDossier.iktatoszam}`,
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
                      dossierId: primaryDossier.id,
                      companyId: recordCompanyId || undefined,
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
    if (hasAnyActiveRule('hatarido_lejart')) {
      const { data: lejartUgyek } = await supabase
        .from('ugy')
        .select(`
          id, 
          company_id,
          targy, 
          hatarido, 
          felelos_user_id, 
          ugyirat(
            id, 
            company_id,
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
            
            const activeDossiers = (ugy.ugyirat || []).filter(
              (d: any) => !['elintezett', 'lezart', 'irattarban', 'selejtezheto'].includes(d.statusz)
            );
            if (activeDossiers.length === 0) continue;

            if (ugyHataridoStr < todayIsoStr) {
              const dossier = activeDossiers[0];
              const recordCompanyId = (dossier as any).company_id || (ugy as any).company_id || null;
              const diffTime = today.getTime() - new Date(ugyHataridoStr).getTime();
              const diffDays = Math.max(1, Math.floor(diffTime / (1000 * 3600 * 24)));

              const lejartSzabaly = findRuleForCompany(
                'hatarido_lejart',
                recordCompanyId,
                (k) => k === 'felelos'
              );
              const lejartFelettesSzabaly = findRuleForCompany(
                'hatarido_lejart',
                recordCompanyId,
                (k) => k === 'vezeto' || k === 'felettes'
              );
              
              // 1. Értesítés a Felelősnek
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
                      dossierId: dossier.id,
                      companyId: recordCompanyId || undefined,
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
                        dossierId: dossier.id,
                        companyId: recordCompanyId || undefined,
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
                const orgUnit = Array.isArray(dossier.szervezeti_egyseg) ? dossier.szervezeti_egyseg[0] : dossier.szervezeti_egyseg;
                let targetLeaderIds: string[] = [];

                if (orgUnit?.vezeto_id) {
                  targetLeaderIds.push(orgUnit.vezeto_id);
                } else if (orgUnit?.id) {
                  const { data: deptManagers } = await supabase
                    .from('felhasznalo_profil')
                    .select('id')
                    .eq('szervezeti_egyseg_id', orgUnit.id)
                    .eq('docs_szerepkor', 'vezeto');
                  
                  if (deptManagers && deptManagers.length > 0) {
                    targetLeaderIds = deptManagers.map((m: any) => m.id);
                  }
                }

                if (targetLeaderIds.length === 0) {
                  let adminQuery = supabase
                    .from('felhasznalo_profil')
                    .select('id')
                    .in('docs_szerepkor', ['admin', 'rendszergazda']);
                  if (recordCompanyId) {
                    adminQuery = adminQuery.eq('company_id', recordCompanyId);
                  }
                  const { data: adminUsers } = await adminQuery;
                  if (adminUsers && adminUsers.length > 0) {
                    targetLeaderIds = adminUsers.map((a: any) => a.id);
                  }
                }

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
                        dossierId: dossier.id,
                        companyId: recordCompanyId || undefined,
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
                          dossierId: dossier.id,
                          companyId: recordCompanyId || undefined,
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
    if (hasAnyActiveRule(['megorzesi_ido_lejart', 'megorzes_lejar'])) {
      const { data: ugyiratok } = await supabase
        .from('ugyirat')
        .select('id, company_id, iktatoszam, megorzesi_ido_vege, statusz, ugy:ugy_id(targy)')
        .not('megorzesi_ido_vege', 'is', null)
        .in('statusz', ['lezart', 'irattarban']);

      if (ugyiratok) {
        for (const ugyirat of ugyiratok) {
          const megorzesVege = new Date(ugyirat.megorzesi_ido_vege).toISOString().split('T')[0];
          
          if (megorzesVege <= todayIsoStr) {
            const recordCompanyId = (ugyirat as any).company_id || null;
            const lejaratSzabaly = findRuleForCompany(
              ['megorzesi_ido_lejart', 'megorzes_lejar'],
              recordCompanyId,
              (k) => k === 'iratkezelo'
            );
            if (!lejaratSzabaly) continue;

            const iratkezeloIds = await getCompanyIratkezelokIds(recordCompanyId);
            if (iratkezeloIds.length > 0) {
              const csatornak = lejaratSzabaly.csatorna || ['email'];
              const targy = Array.isArray(ugyirat.ugy) ? (ugyirat.ugy[0] as any)?.targy : (ugyirat.ugy as any)?.targy || 'Ismeretlen ügy';
              for (const iratkezeloId of iratkezeloIds) {
                if (csatornak.includes('in_app')) {
                  await supabase.from('alkalmazas_ertesites').insert({
                    user_id: iratkezeloId,
                    cim: `Megőrzési idő lejárt: ${ugyirat.iktatoszam}`,
                    szoveg: `A(z) ${ugyirat.iktatoszam} ügyirat (${targy}) megőrzési ideje lejárt, selejtezhetővé vált.`,
                    link_url: '/archive',
                    olvasott: false,
                  });
                }

                if (csatornak.includes('email')) {
                  const iktEmail = await getUserEmailById(iratkezeloId);
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
                      dossierId: ugyirat.id,
                      companyId: recordCompanyId || undefined,
                    });
                    emailsSent++;
                  }
                }

                if (csatornak.includes('sms')) {
                  try {
                    const telefon = await getUserTelefonById(iratkezeloId);
                    if (telefon) {
                      await sendSmsNotification({
                        to: telefon,
                        body: `eaisyDocs: A(z) ${ugyirat.iktatoszam} ügyirat megőrzési ideje lejárt, selejtezhetővé vált.`,
                        subject: `Megőrzési idő lejárt: ${ugyirat.iktatoszam}`,
                        dossierId: ugyirat.id,
                        companyId: recordCompanyId || undefined,
                      });
                    }
                  } catch (e) {
                    console.error("SMS hiba (megorzesi_ido_lejart):", e);
                  }
                }
              }
            }
          }
        }
      }
    }

    // =========================================================================
    // D) HR: ORVOSI VIZSGÁLAT LEJÁRATA (30 és 7 nap, valamint lejárat után)
    // =========================================================================
    if (hasAnyActiveRule('orvosi_vizsgalat_lejarat')) {
      const { data: vizsgalatok } = await supabase
        .from('hr_orvosi_vizsgalat')
        .select('id, company_id, ervenyesseg_datuma, dolgozo_id, hr_dolgozo_adatlap!inner(id, company_id, felhasznalo_profil!inner(nev, hr_szerepkor))')
        .not('ervenyesseg_datuma', 'is', null);

      if (vizsgalatok) {
        for (const v of vizsgalatok) {
          const lejarat = new Date(v.ervenyesseg_datuma);
          const diffDays = Math.ceil((lejarat.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays !== 30 && diffDays !== 7 && diffDays > 0) continue;

          const adatlap = v.hr_dolgozo_adatlap as any;
          const recordCompanyId = (v as any).company_id || adatlap?.company_id || null;
          const orvosiSzabaly = findRuleForCompany('orvosi_vizsgalat_lejarat', recordCompanyId);
          if (!orvosiSzabaly) continue;

          const dolgozoNev = adatlap?.felhasznalo_profil?.nev || 'Munkavállaló';
          const csatornak = orvosiSzabaly.csatorna || [];
          const kinek = orvosiSzabaly.kinek || '';
          const targetUserIds: string[] = [];

          if (kinek.includes('Érintett') && v.dolgozo_id) targetUserIds.push(v.dolgozo_id);
          if (kinek.includes('HR')) {
            const hrIds = await getCompanyHrUserIds(recordCompanyId);
            targetUserIds.push(...hrIds);
          }

          const isExpired = diffDays <= 0;
          const notificationTitle = isExpired ? 'Lejárt orvosi alkalmasság!' : 'Orvosi alkalmasság lejárata';
          const notificationText = isExpired 
            ? `${dolgozoNev} orvosi alkalmassága már ${Math.abs(diffDays)} napja lejárt (${v.ervenyesseg_datuma})!`
            : `${dolgozoNev} orvosi alkalmassága ${diffDays} nap múlva lejár (${v.ervenyesseg_datuma}).`;

          for (const targetId of Array.from(new Set(targetUserIds))) {
            if (csatornak.includes('in_app')) {
              await supabase.from('alkalmazas_ertesites').insert({
                user_id: targetId,
                cim: notificationTitle,
                szoveg: notificationText,
                link_url: '/hr/self-service'
              });
            }
            if (csatornak.includes('email')) {
              const email = await getUserEmailById(targetId);
              if (email) {
                await sendNotificationEmail({
                  to: email,
                  subject: `${notificationTitle}: ${dolgozoNev}`,
                  senderName: "eaisyHR Rendszer",
                  senderEmail: "eaisyhr@thinkai.hu",
                  modul: "hr",
                  companyId: recordCompanyId || undefined,
                  html: buildHtmlEmail(notificationTitle, notificationText, [{ label: "Lejárat", value: v.ervenyesseg_datuma }], "Profil megtekintése", `${getBaseUrl()}/hr`, "eaisyHR")
                });
                emailsSent++;
              }
            }
            if (csatornak.includes('sms')) {
              try {
                const telefon = await getUserTelefonById(targetId);
                if (telefon) {
                  await sendSmsNotification({
                    to: telefon,
                    body: `eaisyHR: ${notificationText}`,
                    subject: notificationTitle,
                    modul: "hr",
                    companyId: recordCompanyId || undefined,
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

    // =========================================================================
    // E) HR: PRÓBAIDŐ LEJÁRATA (7 nap)
    // =========================================================================
    if (hasAnyActiveRule('probaido_lejarat')) {
      const { data: jogviszonyok } = await supabase
        .from('hr_jogviszony')
        .select('id, company_id, dolgozo_id, probaido_vege, hr_dolgozo_adatlap(id, company_id, felhasznalo_profil!inner(nev, kozvetlen_vezeto_id)), hr_beosztas(kozvetlen_vezeto)')
        .not('probaido_vege', 'is', null);

      if (jogviszonyok) {
        for (const jv of jogviszonyok) {
          const lejarat = new Date(jv.probaido_vege);
          const diffDays = Math.ceil((lejarat.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays !== 7) continue;

          const adatlap = jv.hr_dolgozo_adatlap as any;
          const recordCompanyId = (jv as any).company_id || adatlap?.company_id || null;
          const probaidoSzabaly = findRuleForCompany('probaido_lejarat', recordCompanyId);
          if (!probaidoSzabaly) continue;

          const csatornak = probaidoSzabaly.csatorna || [];
          const kinek = probaidoSzabaly.kinek || '';
          const targetUserIds: string[] = [];

          if (kinek.includes('HR')) {
            const hrIds = await getCompanyHrUserIds(recordCompanyId);
            targetUserIds.push(...hrIds);
          }

          const prof = adatlap?.felhasznalo_profil;
          const dolgozoNev = (Array.isArray(prof) ? prof[0]?.nev : prof?.nev) || 'Munkavállaló';

          if (kinek.includes('Vezető')) {
            const vezetoId = Array.isArray(prof) ? prof[0]?.kozvetlen_vezeto_id : prof?.kozvetlen_vezeto_id;
            if (vezetoId) {
              targetUserIds.push(vezetoId);
            } else {
              const beosztasok = jv.hr_beosztas as any[];
              const kozvetlenVezetoNev = beosztasok && beosztasok.length > 0 ? beosztasok[0]?.kozvetlen_vezeto : null;
              if (kozvetlenVezetoNev) {
                const { data: vezetoProfil } = await supabase
                  .from('felhasznalo_profil')
                  .select('id')
                  .ilike('nev', kozvetlenVezetoNev)
                  .maybeSingle();
                if (vezetoProfil) targetUserIds.push(vezetoProfil.id);
              }
            }
          }

          for (const targetId of Array.from(new Set(targetUserIds))) {
            if (csatornak.includes('in_app')) {
              await supabase.from('alkalmazas_ertesites').insert({
                user_id: targetId,
                cim: 'Próbaidő lejárata',
                szoveg: `${dolgozoNev} próbaideje 7 nap múlva lejár.`,
                link_url: '/hr'
              });
            }
            if (csatornak.includes('email')) {
              const email = await getUserEmailById(targetId);
              if (email) {
                await sendNotificationEmail({
                  to: email,
                  subject: `Próbaidő lejárata: ${dolgozoNev}`,
                  senderName: "eaisyHR Rendszer",
                  senderEmail: "eaisyhr@thinkai.hu",
                  modul: "hr",
                  companyId: recordCompanyId || undefined,
                  html: buildHtmlEmail("Próbaidő lejárata közeledik", `${dolgozoNev} próbaideje 7 nap múlva lejár!`, [{ label: "Próbaidő vége", value: jv.probaido_vege }], "Profil megtekintése", `${getBaseUrl()}/hr`, "eaisyHR")
                });
                emailsSent++;
              }
            }
            if (csatornak.includes('sms')) {
              const telefon = await getUserTelefonById(targetId);
              if (telefon) {
                await sendSmsNotification({
                  to: telefon,
                  body: `eaisyHR Emlékeztető: ${dolgozoNev} próbaideje 7 nap múlva lejár (${jv.probaido_vege})!`,
                  subject: `Próbaidő lejárata: ${dolgozoNev}`,
                  modul: "hr",
                  companyId: recordCompanyId || undefined,
                });
              }
            }
          }
        }
      }
    }

    // =========================================================================
    // F) HR: T1041 BEJELENTÉS (2 nap)
    // =========================================================================
    if (hasAnyActiveRule('t1041_bejelentes')) {
      const { data: jogviszonyok, error } = await supabase
        .from('hr_jogviszony')
        .select('id, company_id, dolgozo_id, belepes_datuma, hr_dolgozo_adatlap(id, company_id, felhasznalo_profil!inner(nev))')
        .not('belepes_datuma', 'is', null);

      if (error) console.error("T1041 Query Error:", error);

      if (jogviszonyok) {
        for (const jv of jogviszonyok) {
          const belepes = new Date(jv.belepes_datuma);
          const diffDays = Math.ceil((belepes.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays !== 2) continue;

          const adatlap = jv.hr_dolgozo_adatlap as any;
          const dolgozoId = (jv as any).dolgozo_id || adatlap?.id;
          const recordCompanyId = (jv as any).company_id || adatlap?.company_id || null;

          // Ellenőrizzük, hogy rögzítették-e már a T1041 bejelentést a dolgozóhoz
          if (dolgozoId) {
            const { data: existingT1041 } = await supabase
              .from('hr_t1041_bejelentes')
              .select('id')
              .eq('dolgozo_id', dolgozoId)
              .limit(1)
              .maybeSingle();
            if (existingT1041) continue;
          }

          const t1041Szabaly = findRuleForCompany('t1041_bejelentes', recordCompanyId);
          if (!t1041Szabaly) continue;

          const csatornak = t1041Szabaly.csatorna || [];
          const targetUserIds = await getCompanyHrUserIds(recordCompanyId);
          const prof = adatlap?.felhasznalo_profil;
          const dolgozoNev = (Array.isArray(prof) ? prof[0]?.nev : prof?.nev) || 'Új munkavállaló';

          for (const targetId of Array.from(new Set(targetUserIds))) {
            if (csatornak.includes('in_app')) {
              await supabase.from('alkalmazas_ertesites').insert({
                user_id: targetId,
                cim: 'T1041 Bejelentés Szükséges',
                szoveg: `${dolgozoNev} 2 nap múlva munkába áll! Ne felejtsd el a T1041 bejelentést!`,
                link_url: '/hr'
              });
            }
            if (csatornak.includes('email')) {
              const email = await getUserEmailById(targetId);
              if (email) {
                await sendNotificationEmail({
                  to: email,
                  subject: `T1041 Bejelentés szükséges: ${dolgozoNev}`,
                  senderName: "eaisyHR Rendszer",
                  senderEmail: "eaisyhr@thinkai.hu",
                  modul: "hr",
                  companyId: recordCompanyId || undefined,
                  html: buildHtmlEmail("T1041 Bejelentés", `Kérjük, győződj meg róla, hogy megtörtént a T1041 bejelentés!`, [{ label: "Munkavállaló", value: dolgozoNev }, { label: "Belépés dátuma", value: jv.belepes_datuma }], "Tovább", `${getBaseUrl()}/hr`, "eaisyHR")
                });
                emailsSent++;
              }
            }
            if (csatornak.includes('sms')) {
              try {
                const telefon = await getUserTelefonById(targetId);
                if (telefon) {
                  await sendSmsNotification({
                    to: telefon,
                    body: `eaisyHR: ${dolgozoNev} 2 nap múlva (${jv.belepes_datuma}) munkába áll! Ellenőrizd a T1041 bejelentést!`,
                    subject: `T1041 Bejelentés: ${dolgozoNev}`,
                    modul: "hr",
                    companyId: recordCompanyId || undefined,
                  });
                }
              } catch (e) {
                console.error("Failed to send t1041 sms", e);
              }
            }
          }
        }
      }
    }

    // =========================================================================
    // G) HR: TANULMÁNYI SZERZŐDÉS LEJÁRAT (30 nap, 7 nap, lejárt)
    // =========================================================================
    if (hasAnyActiveRule('tanulmanyi_szerzodes_lejarat')) {
      const { data: szerzodesek, error } = await supabase
        .from('hr_tanulmanyi_szerzodes')
        .select('id, company_id, dolgozo_id, kepzes_neve, lejarat_datuma, hr_dolgozo_adatlap(id, company_id, felhasznalo_profil!inner(nev))')
        .not('lejarat_datuma', 'is', null);

      if (error) console.error("Tanulmányi szerződés Query Error:", error);

      if (szerzodesek) {
        for (const sz of szerzodesek) {
          const lejarat = new Date(sz.lejarat_datuma);
          const diffDays = Math.ceil((lejarat.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays !== 30 && diffDays !== 7 && diffDays > 0) continue;

          const adatlap = sz.hr_dolgozo_adatlap as any;
          const recordCompanyId = (sz as any).company_id || adatlap?.company_id || null;
          const tanulmanyiSzabaly = findRuleForCompany('tanulmanyi_szerzodes_lejarat', recordCompanyId);
          if (!tanulmanyiSzabaly) continue;

          const csatornak = tanulmanyiSzabaly.csatorna || [];
          const kinek = tanulmanyiSzabaly.kinek || 'HR, Érintett';
          const targetUserIds: string[] = [];

          if (kinek.includes('HR')) {
            const hrIds = await getCompanyHrUserIds(recordCompanyId);
            targetUserIds.push(...hrIds);
          }
          if (kinek.includes('Érintett') && sz.dolgozo_id) {
            targetUserIds.push(sz.dolgozo_id);
          }

          const prof = adatlap?.felhasznalo_profil;
          const dolgozoNev = (Array.isArray(prof) ? prof[0]?.nev : prof?.nev) || 'Munkavállaló';
          const title = diffDays <= 0 ? 'Lejárt tanulmányi szerződés!' : 'Tanulmányi szerződés lejárata közeledik';
          const text = diffDays <= 0 
            ? `${dolgozoNev} "${sz.kepzes_neve}" tanulmányi szerződése lejárt (${sz.lejarat_datuma})!` 
            : `${dolgozoNev} "${sz.kepzes_neve}" tanulmányi szerződése ${diffDays} nap múlva lejár!`;

          for (const targetId of Array.from(new Set(targetUserIds))) {
            if (csatornak.includes('in_app')) {
              await supabase.from('alkalmazas_ertesites').insert({
                user_id: targetId,
                cim: title,
                szoveg: text,
                link_url: '/hr'
              });
            }
            if (csatornak.includes('email')) {
              const email = await getUserEmailById(targetId);
              if (email) {
                await sendNotificationEmail({
                  to: email,
                  subject: `${title}: ${dolgozoNev}`,
                  senderName: "eaisyHR Rendszer",
                  senderEmail: "eaisyhr@thinkai.hu",
                  modul: "hr",
                  companyId: recordCompanyId || undefined,
                  html: buildHtmlEmail(title, text, [{ label: "Lejárat dátuma", value: sz.lejarat_datuma }, { label: "Képzés neve", value: sz.kepzes_neve }], "Profil megtekintése", `${getBaseUrl()}/hr`, "eaisyHR")
                });
                emailsSent++;
              }
            }
            if (csatornak.includes('sms')) {
              try {
                const telefon = await getUserTelefonById(targetId);
                if (telefon) {
                  await sendSmsNotification({
                    to: telefon,
                    body: `eaisyHR: ${text}`,
                    subject: title,
                    modul: "hr",
                    companyId: recordCompanyId || undefined,
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

    // =========================================================================
    // H) HR: HATÁROZOTT IDEJŰ SZERZŐDÉS LEJÁRAT (15 nap)
    // =========================================================================
    if (hasAnyActiveRule('hatarozott_szerzodes_lejarat')) {
      const { data: jogviszonyok, error } = await supabase
        .from('hr_jogviszony')
        .select('id, company_id, kilepes_datuma, hr_dolgozo_adatlap(id, company_id, felhasznalo_profil!inner(nev, kozvetlen_vezeto_id)), hr_beosztas(kozvetlen_vezeto)')
        .not('kilepes_datuma', 'is', null);

      if (error) console.error("Határozott idejű szerződés Query Error:", error);

      if (jogviszonyok) {
        for (const jv of jogviszonyok) {
          const lejarat = new Date(jv.kilepes_datuma);
          const diffDays = Math.ceil((lejarat.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays !== 15) continue;

          const adatlap = jv.hr_dolgozo_adatlap as any;
          const recordCompanyId = (jv as any).company_id || adatlap?.company_id || null;
          const hatarozottSzabaly = findRuleForCompany('hatarozott_szerzodes_lejarat', recordCompanyId);
          if (!hatarozottSzabaly) continue;

          const csatornak = hatarozottSzabaly.csatorna || [];
          const kinek = hatarozottSzabaly.kinek || 'HR, Vezető';
          const targetUserIds: string[] = [];

          if (kinek.includes('HR')) {
            const hrIds = await getCompanyHrUserIds(recordCompanyId);
            targetUserIds.push(...hrIds);
          }

          const prof = adatlap?.felhasznalo_profil;
          const dolgozoNev = (Array.isArray(prof) ? prof[0]?.nev : prof?.nev) || 'Munkavállaló';
          const vezetoIdFromProfile = Array.isArray(prof) ? prof[0]?.kozvetlen_vezeto_id : prof?.kozvetlen_vezeto_id;

          if (kinek.includes('Vezető')) {
            if (vezetoIdFromProfile) {
              targetUserIds.push(vezetoIdFromProfile);
            } else {
              const beosztasok = jv.hr_beosztas as any[];
              const kozvetlenVezeto = beosztasok && beosztasok.length > 0 ? beosztasok[0]?.kozvetlen_vezeto : null;
              if (kozvetlenVezeto) {
                const { data: vezetoProfil } = await supabase
                  .from('felhasznalo_profil')
                  .select('id')
                  .ilike('nev', kozvetlenVezeto)
                  .maybeSingle();
                if (vezetoProfil) targetUserIds.push(vezetoProfil.id);
              }
            }
          }

          for (const targetId of Array.from(new Set(targetUserIds))) {
            const title = 'Lejáró határozott idejű szerződés';
            const text = `${dolgozoNev} határozott idejű szerződése (jogviszonya) 15 nap múlva lejár (${jv.kilepes_datuma})! Kérjük, egyeztessétek a hosszabbítást!`;

            if (csatornak.includes('in_app')) {
              await supabase.from('alkalmazas_ertesites').insert({
                user_id: targetId,
                cim: title,
                szoveg: text,
                link_url: '/hr'
              });
            }
            if (csatornak.includes('email')) {
              const email = await getUserEmailById(targetId);
              if (email) {
                await sendNotificationEmail({
                  to: email,
                  subject: `${title}: ${dolgozoNev}`,
                  senderName: "eaisyHR Rendszer",
                  senderEmail: "eaisyhr@thinkai.hu",
                  modul: "hr",
                  companyId: recordCompanyId || undefined,
                  html: buildHtmlEmail(title, text, [{ label: "Szerződés vége", value: jv.kilepes_datuma }], "Profil megtekintése", `${getBaseUrl()}/hr`, "eaisyHR")
                });
                emailsSent++;
              }
            }
            if (csatornak.includes('sms')) {
              try {
                const telefon = await getUserTelefonById(targetId);
                if (telefon) {
                  await sendSmsNotification({
                    to: telefon,
                    body: `eaisyHR: ${text}`,
                    subject: title,
                    modul: "hr",
                    companyId: recordCompanyId || undefined,
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

    // =========================================================================
    // I) HR: TELJESÍTMÉNYÉRTÉKELÉS HATÁRIDŐK (7 nap a ciklus zárása előtt)
    // =========================================================================
    if (hasAnyActiveRule('teljesitmeny_ertekeles')) {
      const { data: ciklusok, error } = await supabase
        .from('hr_teljesitmeny_ciklus')
        .select('id, company_id, megnevezes, befejezo_datum, statusz')
        .eq('statusz', 'nyitott')
        .not('befejezo_datum', 'is', null);

      if (error) console.error("Teljesítményértékelési ciklus Query Error:", error);

      if (ciklusok) {
        for (const ciklus of ciklusok) {
          const befejezes = new Date(ciklus.befejezo_datum);
          const diffDays = Math.ceil((befejezes.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays !== 7) continue;

          const recordCompanyId = (ciklus as any).company_id || null;
          const kpiSzabaly = findRuleForCompany('teljesitmeny_ertekeles', recordCompanyId);
          if (!kpiSzabaly) continue;

          const csatornak = kpiSzabaly.csatorna || [];
          const kinek = kpiSzabaly.kinek || 'Érintett, Vezető';

          // Lekérjük az adott ciklushoz tartozó, még le nem zárt célkitűzéseket
          const { data: nyitottKpik } = await supabase
            .from('hr_teljesitmeny')
            .select('id, dolgozo_id, celkituzes, workflow_fazis')
            .eq('ciklus_id', ciklus.id)
            .neq('workflow_fazis', 'lezart');

          if (!nyitottKpik || nyitottKpik.length === 0) continue;

          const targetUserIds = new Set<string>();
          const dolgozoIds = Array.from(new Set(nyitottKpik.map((k: any) => k.dolgozo_id).filter(Boolean)));

          for (const dId of dolgozoIds) {
            if (kinek.includes('Érintett')) {
              targetUserIds.add(dId);
            }
            if (kinek.includes('Vezető')) {
              const { data: dProf } = await supabase
                .from('felhasznalo_profil')
                .select('kozvetlen_vezeto_id')
                .eq('id', dId)
                .maybeSingle();
              if (dProf?.kozvetlen_vezeto_id) {
                targetUserIds.add(dProf.kozvetlen_vezeto_id);
              }
            }
          }

          const title = `Teljesítményértékelési időszak zárul: ${ciklus.megnevezes}`;
          const text = `A(z) "${ciklus.megnevezes}" értékelési időszak 7 nap múlva (${ciklus.befejezo_datum}) lezárul. Kérjük, véglegesítsétek a nyitott célkitűzéseket és értékeléseket!`;

          for (const targetId of Array.from(targetUserIds)) {
            if (csatornak.includes('in_app')) {
              await supabase.from('alkalmazas_ertesites').insert({
                user_id: targetId,
                cim: title,
                szoveg: text,
                link_url: '/hr/performance'
              });
            }
            if (csatornak.includes('email')) {
              const email = await getUserEmailById(targetId);
              if (email) {
                await sendNotificationEmail({
                  to: email,
                  subject: title,
                  senderName: "eaisyHR Rendszer",
                  senderEmail: "eaisyhr@thinkai.hu",
                  modul: "hr",
                  companyId: recordCompanyId || undefined,
                  html: buildHtmlEmail(
                    title,
                    text,
                    [
                      { label: "Értékelési ciklus", value: ciklus.megnevezes },
                      { label: "Zárás dátuma", value: ciklus.befejezo_datum }
                    ],
                    "Teljesítményértékelés megnyitása",
                    `${getBaseUrl()}/hr/performance`,
                    "eaisyHR"
                  )
                });
                emailsSent++;
              }
            }
            if (csatornak.includes('sms')) {
              try {
                const telefon = await getUserTelefonById(targetId);
                if (telefon) {
                  await sendSmsNotification({
                    to: telefon,
                    body: `eaisyHR: ${text}`,
                    subject: title,
                    modul: "hr",
                    companyId: recordCompanyId || undefined,
                  });
                }
              } catch (e) {
                console.error("Failed to send teljesitmeny_ertekeles sms", e);
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
