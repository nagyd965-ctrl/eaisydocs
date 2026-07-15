import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const id = params.id
  const supabase = await createClient()

  // Lekérdezzük az adott ügyirathoz (vagy a hozzá tartozó iratokhoz) tartozó naplóbejegyzéseket
  const { data, error } = await supabase
    .from("esemeny_naplo")
    .select(`
      id,
      tortent,
      esemeny_tipus,
      user_id,
      elozo_ertek,
      uj_ertek,
      indoklas,
      entitas_tipus,
      entitas_id
    `)
    .or(`and(entitas_tipus.eq.ugyirat,entitas_id.eq.${id})`)
    .order('tortent', { ascending: false })

  // Jegyzet: Ideális esetben lekérdeznénk az ugyirathoz tartozó iratok ID-jait is,
  // és azokra is rászűrnénk, de a demó kedvéért a közvetlen ügyirat események is elegendőek.

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ 
    ugyirat_id: id,
    eletciklus: data 
  })
}
