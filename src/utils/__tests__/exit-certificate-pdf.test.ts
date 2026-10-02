import { test } from 'node:test'
import assert from 'node:assert'
import { generateExitCertificateHtml, generateExitCertificatePdfBuffer } from '../hr/exit-certificate-pdf-generator'
import { ExitCertificatePdfData } from '../hr/exit-certificate-constants'

test('Törvényes Kilépő Igazolás & Átadás-Átvételi Nyugta (Mt. 80. §)', async (t) => {
  const sampleData: ExitCertificatePdfData = {
    employeeName: 'Demo Márk',
    employeeId: 'dolgozo-123',
    offboardingId: 'off-456',
    munkakor: 'Flottakezelő',
    feorKod: '4121',
    reszleg: 'FCM',
    szuletesiHely: 'Budapest',
    szuletesiDatum: '1990. 05. 14.',
    anyjaNeve: 'Nagy Erzsébet',
    lakcim: '1138 Budapest, Váci út 140.',
    adoazonosito: '8493021948',
    tajSzam: '123 456 789',
    jogviszonyKezdete: '2023. 02. 01.',
    jogviszonyVege: '2026. 10. 05.',
    megszunesModja: 'kozos_megegyezes',
    megszunesModjaLabel: 'Közös megegyezés (Mt. 64. § (1) bek. a) pont)',
    levonasok: 'A munkavállaló munkabérét végrehajtói vagy egyéb bírósági letiltás, gyermektartásdíj nem terheli.',
    vanLevonas: false,
    betegszabadsagNapok: 2,
    vegkielegitesOsszeg: 0,
    atvetelModja: 'szemelyes',
    kelt: '2026. október 5.'
  }

  await t.test('generateExitCertificateHtml tartalmazza a kötelező jogszabályi elemeket és adatokat', () => {
    const html = generateExitCertificateHtml(sampleData)
    assert.ok(html.includes('Demo Márk'), 'Tartalmaznia kell a dolgozó nevét')
    assert.ok(html.includes('Flottakezelő'), 'Tartalmaznia kell a munkakört')
    assert.ok(html.includes('4121'), 'Tartalmaznia kell a FEOR kódot')
    assert.ok(html.includes('Mt. 80. § (2)'), 'Tartalmaznia kell az Mt. 80. § (2) hivatkozást')
    assert.ok(html.includes('Flt. 36/A. §'), 'Tartalmaznia kell az Flt. 36/A. § hivatkozást')
    assert.ok(html.includes('2 munkanap'), 'Tartalmaznia kell a betegszabadság napjait')
    assert.ok(html.includes('Személyes átvételi elismervény'), 'Tartalmaznia kell a személyes átvételi záradékot')
    assert.ok(html.includes('TERVEZET (MT. 80. §)'), 'Iktatószám nélkül tervezetként jelenik meg')
  })

  await t.test('generateExitCertificateHtml kezeli a postai feladást és az iktatószámot', () => {
    const postalData: ExitCertificatePdfData = {
      ...sampleData,
      atvetelModja: 'postai',
      postaiAzonosito: 'RL-984729104-HU',
      iktatoszam: 'HR/2026/00039/1.4'
    }
    const html = generateExitCertificateHtml(postalData)
    assert.ok(html.includes('Postai kézbesítés igazolása'), 'Tartalmaznia kell a postai kézbesítés szöveget')
    assert.ok(html.includes('RL-984729104-HU'), 'Tartalmaznia kell a ragszámot')
    assert.ok(html.includes('HR/2026/00039/1.4'), 'Tartalmaznia kell az iktatószámot')
  })

  await t.test('generateExitCertificatePdfBuffer valós PDF buffert hoz létre Puppeteerrel', async () => {
    const buffer = await generateExitCertificatePdfBuffer(sampleData)
    assert.ok(Buffer.isBuffer(buffer), 'Buffernek kell lennie')
    assert.ok(buffer.length > 1000, 'A PDF méretének nagyobbnak kell lennie 1KB-nál')
    assert.strictEqual(buffer.subarray(0, 4).toString(), '%PDF', 'PDF fájl fejlécnek (%PDF) kell kezdődnie')
  })
})
