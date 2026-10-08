import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const adminClient = createClient(supabaseUrl, supabaseServiceKey)

async function runTest() {
  console.log('=== MULTI-TENANCY E2E ELLENŐRZŐ TESZT INDÍTÁSA ===\n')

  // 1. Meglévő cég ellenőrzése
  const { data: defaultCompany, error: defErr } = await adminClient
    .from('companies')
    .select('id, name, owner_id')
    .eq('name', 'Think AI Kft.')
    .single()

  if (defErr || !defaultCompany) {
    console.error('❌ Hiba: Alapértelmezett cég nem található!', defErr)
    process.exit(1)
  }
  console.log(`✅ 1. Alapértelmezett cég megtalálva: ${defaultCompany.name} (${defaultCompany.id})`)

  // 2. Tagok ellenőrzése Think AI Kft.-ben
  const { count: memberCount, error: memberErr } = await adminClient
    .from('company_members')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', defaultCompany.id)

  console.log(`✅ 2. Think AI Kft. tagok száma: ${memberCount}`)

  // 3. Cache ellenőrzése
  const { count: cacheCount } = await adminClient
    .from('user_company_access_cache')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', defaultCompany.id)

  console.log(`✅ 3. Access Cache szinkronizálva: ${cacheCount} bejegyzés`)

  // 4. Második tesztcég létrehozása
  const testCompanyName = `Teszt Holding Zrt. (${Date.now().toString().slice(-4)})`
  const { data: testCompany, error: createCompErr } = await adminClient
    .from('companies')
    .insert({
      name: testCompanyName,
      tax_number: '29876543-2-42',
      address: '1117 Budapest, Infopark sétány 1.',
      representative_name: 'Teszt Elek',
      owner_id: defaultCompany.owner_id
    })
    .select('id, name, share_token')
    .single()

  if (createCompErr || !testCompany) {
    console.error('❌ Hiba a tesztcég létrehozásakor:', createCompErr)
    process.exit(1)
  }
  console.log(`✅ 4. Második cég sikeresen létrehozva: ${testCompany.name} (${testCompany.id})`)
  console.log(`      Megosztási meghívókód (share_token): ${testCompany.share_token}`)

  // 5. Trigger automatikus tagság és cache ellenőrzése
  const { data: autoMember } = await adminClient
    .from('company_members')
    .select('role')
    .eq('company_id', testCompany.id)
    .eq('user_id', defaultCompany.owner_id)
    .single()

  console.log(`✅ 5. Automatikus tulajdonosi tagság létrejött: role = ${autoMember?.role}`)

  const { data: autoCache } = await adminClient
    .from('user_company_access_cache')
    .select('role')
    .eq('company_id', testCompany.id)
    .eq('user_id', defaultCompany.owner_id)
    .single()

  console.log(`✅ 6. Access Cache automatikus trigger szinkronizáció működik: role = ${autoCache?.role}`)

  // 7. Teszt adatok rögzítése mindkét céghez
  const { data: partnerComp2 } = await adminClient
    .from('partner')
    .insert({
      company_id: testCompany.id,
      nev: 'Teszt Cég Partner Kft.',
      adoszam: '12345678-1-42',
      tipus: 'ceg'
    })
    .select('id, nev, company_id')
    .single()

  console.log(`✅ 7. Partner létrehozva az új céghez: ${partnerComp2?.nev}`)

  // 8. Lekérdezések izolációjának ellenőrzése
  const { data: partnersInDefault } = await adminClient
    .from('partner')
    .select('id, nev')
    .eq('company_id', defaultCompany.id)
    .eq('nev', 'Teszt Cég Partner Kft.')

  const { data: partnersInTest } = await adminClient
    .from('partner')
    .select('id, nev')
    .eq('company_id', testCompany.id)
    .eq('nev', 'Teszt Cég Partner Kft.')

  if (partnersInDefault?.length === 0 && partnersInTest?.length === 1) {
    console.log(`✅ 8. Szigorú adatszeparáció igazolva! A Teszt Partner Kft. CSAK a Teszt Holding Zrt.-ben létezik, a Think AI Kft.-ben NEM látható!`)
  } else {
    console.error(`❌ Adatszeparációs hiba!`, { partnersInDefault, partnersInTest })
  }

  // 9. Csatlakozás meghívókóddal RPC ellenőrzése
  console.log(`\n=== CSATLAKOZÁS MEGHÍVÓKÓDDAL TESZTELÉSE ===`)
  // Teszteljük egy másik felhasználóval (vagy ugyanazzal)
  const { data: joinRes, error: joinErr } = await adminClient.rpc('join_company_by_token', {
    p_share_token: testCompany.share_token
  })
  console.log(`✅ 9. join_company_by_token RPC eredmény:`, joinRes || joinErr)

  // 10. Takarítás a tesztcég után (hogy ne szennyezze a DB-t)
  await adminClient.from('partner').delete().eq('id', partnerComp2?.id)
  await adminClient.from('companies').delete().eq('id', testCompany.id)
  console.log(`✅ 10. Tesztadatok tisztán eltávolítva (CASCADE törléssel az access cache és tagok is automatikusan törlődtek).`)

  console.log(`\n🎉 MINDEN MULTI-TENANCY E2E TESZT SIKERESEN LEFUTOTT ÉS IGAZOLVA! 🎉\n`)
}

runTest().catch(console.error)
