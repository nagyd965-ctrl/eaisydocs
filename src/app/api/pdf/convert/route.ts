import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { convertToPdfA } from '@/utils/pdfa-converter'

// Ezt a végpontot a háttérben (aszinkron módon) fogjuk meghívni a fájlfeltöltések után.
export async function POST(request: Request) {
  try {
    const { fajl_id } = await request.json()

    if (!fajl_id) {
      return NextResponse.json({ error: 'fajl_id is required' }, { status: 400 })
    }

    // Admin szintű Supabase kliens a háttérfolyamathoz (RLS megkerülése)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // 1. Lekérjük a fájl adatait
    const { data: fajl, error: fetchError } = await supabase
      .from('irat_fajl')
      .select('id, storage_path, pdfa_path, eredeti_fajlnev')
      .eq('id', fajl_id)
      .single()

    if (fetchError || !fajl) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    if (fajl.pdfa_path) {
      return NextResponse.json({ message: 'Already converted' }, { status: 200 })
    }

    if (!fajl.storage_path) {
      return NextResponse.json({ error: 'No storage path found' }, { status: 400 })
    }

    // 2. Fájl letöltése a Storage-ból
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('iratok')
      .download(fajl.storage_path)

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Failed to download file from storage' }, { status: 500 })
    }

    const inputBuffer = Buffer.from(await fileData.arrayBuffer())

    // 3. Konvertálás PDF/A formátumra (Fallback logikával, ha nincs Ghostscript)
    const { buffer: pdfaBuffer, isFallback } = await convertToPdfA(inputBuffer)

    // 4. Konvertált fájl feltöltése
    const ext = fajl.eredeti_fajlnev.split('.').pop()
    const isImage = ['jpg', 'jpeg', 'png'].includes(ext?.toLowerCase() || '')
    
    // Ha kép volt, akkor is .pdf lesz a vége az archívnak
    const newStoragePath = fajl.storage_path.replace(`.${ext}`, `_pdfa.pdf`)

    const { error: uploadError } = await supabase.storage
      .from('iratok')
      .upload(newStoragePath, pdfaBuffer, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) {
      return NextResponse.json({ error: 'Failed to upload converted PDF/A' }, { status: 500 })
    }

    // 5. Adatbázis frissítése a pdfa_path mezővel
    const { error: updateError } = await supabase
      .from('irat_fajl')
      .update({ pdfa_path: newStoragePath })
      .eq('id', fajl_id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update database' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Successfully converted and saved PDF/A', 
      pdfa_path: newStoragePath,
      fallback_used: isFallback 
    }, { status: 200 })

  } catch (error) {
    console.error('PDF/A API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
