import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Briefcase, ArrowRight, Lock } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default async function InternalCareerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Lekérdezzük az összes aktív hirdetést (publikus + belső)
  const { data: hirdetesek } = await supabase
    .from("hr_allashirdetes")
    .select(`
      id, 
      cim, 
      rovid_leiras,
      nyitva_tol,
      is_internal,
      hr_munkakor (megnevezes)
    `)
    .eq("aktiv", true)
    .order("created_at", { ascending: false })
    .returns<any[]>()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Belső Álláshirdetések</h1>
        <p className="text-muted-foreground mt-1">
          Nézd meg a nyitott pozícióinkat, és jelentkezz egy új kihívásra a cégen belül!
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {hirdetesek?.map((hirdetes) => (
          <Card key={hirdetes.id} className={cn("flex flex-col hover:shadow-md transition-shadow", hirdetes.is_internal ? "border-primary/50 bg-primary/5" : "")}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl">{hirdetes.cim}</CardTitle>
                {hirdetes.is_internal && (
                  <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary border-primary/20">
                    <Lock className="w-3 h-3 mr-1" />
                    Belső
                  </span>
                )}
              </div>
              <CardDescription className="flex items-center gap-2 mt-2">
                <Briefcase className="w-4 h-4" /> 
                {hirdetes.hr_munkakor?.megnevezes || hirdetes.cim}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground">
                {hirdetes.rovid_leiras || "Nincs rövid leírás megadva."}
              </p>
            </CardContent>
            <div className="p-6 pt-0 mt-auto">
              <Link 
                href={`/karrier/${hirdetes.id}`} 
                className={cn(buttonVariants({ variant: hirdetes.is_internal ? "default" : "outline" }), "w-full")}
              >
                Részletek és jelentkezés
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </Card>
        ))}

        {!hirdetesek?.length && (
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed rounded-lg">
            Jelenleg nincsenek nyitott pozíciók.
          </div>
        )}
      </div>
    </div>
  )
}
