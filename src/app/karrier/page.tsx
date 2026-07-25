import { createClient as createAdminClient } from "@supabase/supabase-js"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Briefcase, ArrowRight } from "lucide-react"

export default async function KarrierPage() {
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: hirdetesek } = await supabaseAdmin
    .from("hr_allashirdetes")
    .select(`
      id, 
      cim, 
      rovid_leiras,
      nyitva_tol,
      hr_munkakor (megnevezes)
    `)
    .eq("aktiv", true)
    .eq("publikus", true)
    .order("created_at", { ascending: false })
    .returns<any[]>()

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-16 px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Csatlakozz hozzánk!</h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Nézd meg nyitott pozícióinkat és építsük együtt a jövőt. Várjuk jelentkezésedet nyitott és dinamikus csapatunkba!
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto py-12 px-4">
        {hirdetesek && hirdetesek.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {hirdetesek.map((hirdetes) => (
              <Card key={hirdetes.id} className="flex flex-col hover:shadow-md transition-shadow bg-white">
                <CardHeader>
                  <CardTitle className="text-xl">{hirdetes.cim}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-2">
                    <Briefcase className="w-4 h-4" /> 
                    {hirdetes.hr_munkakor?.megnevezes || hirdetes.cim}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-muted-foreground line-clamp-3">
                    {hirdetes.rovid_leiras || "Kattints a részletekért és jelentkezz hozzánk még ma!"}
                  </p>
                </CardContent>
                <CardFooter className="pt-4 border-t">
                  <Link href={`/karrier/${hirdetes.id}`} className={cn(buttonVariants({ variant: "default" }), "w-full group")}>
                    Megnézem <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <Briefcase className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h2 className="text-2xl font-semibold mb-2">Jelenleg nincs nyitott pozíciónk</h2>
            <p className="text-muted-foreground">Nézz vissza később, vagy kövess minket a közösségi médiában!</p>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t py-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Karrierportál. Minden jog fenntartva.</p>
      </footer>
    </div>
  )
}
