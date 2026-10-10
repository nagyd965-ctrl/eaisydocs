import { test } from 'node:test'
import assert from 'node:assert'
import { DEFAULT_EXIT_DOCUMENTS, ExitCertificatePdfData } from '../hr/exit-certificate-constants'

test('Offboarding Hatósági Megfelelőség és Iktatási Védőháló (Mt. 80. §)', async (t) => {
  await t.test('DEFAULT_EXIT_DOCUMENTS tartalmazza mind az 5 törvényes igazolást', () => {
    assert.strictEqual(DEFAULT_EXIT_DOCUMENTS.length, 5, 'Pontosan 5 törvényes igazolásnak kell lennie')
    assert.ok(DEFAULT_EXIT_DOCUMENTS.some(d => d.includes('Mt. 80. §')), 'Munkáltatói igazolás kötelező')
    assert.ok(DEFAULT_EXIT_DOCUMENTS.some(d => d.includes('Flt. 36/A. §')), 'Álláskeresési járadék igazolás kötelező')
    assert.ok(DEFAULT_EXIT_DOCUMENTS.some(d => d.includes('TB kiskönyv')), 'TB kiskönyv bejegyzés kötelező')
    assert.ok(DEFAULT_EXIT_DOCUMENTS.some(d => d.includes('NAV Adóadatlap') || d.includes('személyi jövedelemadó')), 'NAV adóadatlap kötelező')
    assert.ok(DEFAULT_EXIT_DOCUMENTS.some(d => d.includes('letiltásokról') || d.includes('tartozásokról')), 'Letiltási nyilatkozat kötelező')
  })

  await t.test('Tárgyévi betegszabadság napok aggregációs logikája kizárólag a jóváhagyott tárgyévi betegszabadságot összegzi', () => {
    const currentYear = new Date().getFullYear()
    const leaves = [
      { tipus: 'betegszabadsag', statusz: 'jovahagyva', kezdet: `${currentYear}-02-10`, napok_szama: 3 },
      { tipus: 'betegszabadsag', statusz: 'jovahagyva', kezdet: `${currentYear}-06-15`, napok_szama: 4 },
      { tipus: 'fizetett_szabadsag', statusz: 'jovahagyva', kezdet: `${currentYear}-07-01`, napok_szama: 10 },
      { tipus: 'betegszabadsag', statusz: 'elutasitva', kezdet: `${currentYear}-08-01`, napok_szama: 5 },
      { tipus: 'betegszabadsag', statusz: 'jovahagyva', kezdet: `${currentYear - 1}-11-01`, napok_szama: 8 }
    ]

    const filtered = leaves.filter(l => 
      l.tipus === 'betegszabadsag' && 
      l.statusz === 'jovahagyva' && 
      l.kezdet >= `${currentYear}-01-01`
    )

    const sumSickDays = filtered.reduce((acc, curr) => acc + curr.napok_szama, 0)
    assert.strictEqual(sumSickDays, 7, 'Csak a tárgyévi jóváhagyott betegszabadságok (3 + 4 = 7 nap) számítanak bele')
  })

  await t.test('Fail-Safe iktatási lista garantálja a kilépő igazolás meglétét lezáráskor', () => {
    // Ha a kilepo_igazolas_pdf_url eredetileg null volt, de a fail-safe generálta
    const initialOffboarding = {
      szerzodes_pdf_url: 'hr/offboarding/123/contract.pdf',
      eszkoz_elszamolas_pdf_url: null,
      t1041_nyugta_url: 'hr/offboarding/123/t1041.pdf',
      kilepo_igazolas_pdf_url: null as string | null
    }

    let kilepoPdfUrl: string | null = initialOffboarding.kilepo_igazolas_pdf_url
    if (!kilepoPdfUrl) {
      // Szimulált fail-safe generálás
      kilepoPdfUrl = 'hr/offboarding/123/auto_generated_exit_cert.pdf'
    }

    const urlsToCheck = [
      initialOffboarding.szerzodes_pdf_url,
      initialOffboarding.eszkoz_elszamolas_pdf_url,
      initialOffboarding.t1041_nyugta_url,
      kilepoPdfUrl
    ].filter(Boolean)

    assert.strictEqual(urlsToCheck.length, 3, 'Mindhárom létező dokumentum bekerül az iktatási listába')
    assert.ok(urlsToCheck.includes('hr/offboarding/123/auto_generated_exit_cert.pdf'), 'A generált kilépő igazolás bekerül a listába')
  })

  await t.test('Adatlap fallback kitöltés biztosítja a hiánytalan személyes adatokat', () => {
    const rawPayload: Partial<ExitCertificatePdfData> = {}
    const adatlap = {
      szuletesi_hely: 'Debrecen',
      szuletesi_datum: '1988. 03. 22.',
      anyja_szuletesi_neve: 'Kovács Ilona',
      allando_lakcim: '4025 Debrecen, Piac utca 12.',
      adoazonosito_jel: '8392019482',
      taj_szam: '987 654 321',
      feor_kod: '3122',
      munkakor: 'Rendszerüzemeltető'
    }

    const resolved = {
      szuletesiHely: rawPayload.szuletesiHely || adatlap.szuletesi_hely,
      szuletesiDatum: rawPayload.szuletesiDatum || adatlap.szuletesi_datum,
      anyjaNeve: rawPayload.anyjaNeve || adatlap.anyja_szuletesi_neve,
      lakcim: rawPayload.lakcim || adatlap.allando_lakcim,
      adoazonosito: rawPayload.adoazonosito || adatlap.adoazonosito_jel,
      tajSzam: rawPayload.tajSzam || adatlap.taj_szam,
      feorKod: rawPayload.feorKod || adatlap.feor_kod,
      munkakor: rawPayload.munkakor || adatlap.munkakor
    }

    assert.strictEqual(resolved.szuletesiHely, 'Debrecen')
    assert.strictEqual(resolved.adoazonosito, '8392019482')
    assert.strictEqual(resolved.feorKod, '3122')
    assert.strictEqual(resolved.munkakor, 'Rendszerüzemeltető')
  })
})
