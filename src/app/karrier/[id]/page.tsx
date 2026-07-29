import { createClient as createAdminClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowLeft, Briefcase, Calendar } from "lucide-react"
import { ApplicationForm } from "./application-form"

export default async function HirdetesReszletekPage({ params }: { params: Promise<{ id: string }> }) {
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const resolvedParams = await params
  const { id } = resolvedParams

  const { data: hirdetes, error } = await supabaseAdmin
    .from("hr_allashirdetes")
    .select(`
      *,
      hr_munkakor (
        megnevezes
      )
    `)
    .eq("id", id)
    .eq("aktiv", true)
    .eq("publikus", true)
    .single()
    .returns<any>()

  if (error) {
    console.error("Supabase hiba a hirdetes lekeresekor:", error)
  }

  if (!hirdetes) {
    notFound()
  }

  const dateStr = new Date(hirdetes.nyitva_tol).toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/karrier" className={cn(buttonVariants({ variant: "ghost" }), "text-primary-foreground/80 hover:text-white hover:bg-primary/50 mb-6 -ml-4")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Vissza a nyitott pozíciókhoz
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{hirdetes.cim}</h1>
          <div className="flex flex-wrap gap-4 text-primary-foreground/90 text-sm">
            <div className="flex items-center gap-1.5">
              <Briefcase className="w-4 h-4" /> 
              {hirdetes.hr_munkakor?.megnevezes || hirdetes.cim}
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> 
              Közzétéve: {dateStr}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto mt-8 px-4 grid md:grid-cols-[1fr_400px] gap-8 items-start">
        {/* Leírás */}
        <div className="bg-white p-8 rounded-lg shadow-sm border space-y-6">
          {hirdetes.rovid_leiras && (
            <p className="text-lg text-muted-foreground leading-relaxed font-medium">
              {hirdetes.rovid_leiras}
            </p>
          )}

          <div className="prose max-w-none prose-slate">
            {hirdetes.reszletes_leiras ? (
              <div dangerouslySetInnerHTML={{ __html: hirdetes.reszletes_leiras.replace(/\n/g, '<br/>') }} />
            ) : (
              <div>
                <p>Csatlakozz hozzánk <strong>{hirdetes.cim}</strong> pozícióba!</p>
              </div>
            )}
          </div>
        </div>

        {/* Űrlap */}
        <div className="sticky top-6">
          <ApplicationForm allashirdetesId={hirdetes.id} munkakorId={hirdetes.munkakor_id} />
        </div>
      </main>
    </div>
  )
}
