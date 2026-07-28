"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"
import { createClient } from "@/utils/supabase/client"

export function ModuleSwitcher() {
  const pathname = usePathname()
  const isHR = pathname.startsWith("/hr")
  const [modules, setModules] = React.useState<string[]>(["docs", "hr"]) // Default fallback for UI
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchModules() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from("felhasznalo_profil").select("elerheto_modulok").eq("id", user.id).single()
        if (data?.elerheto_modulok) {
          setModules(data.elerheto_modulok)
        }
      }
      setLoading(false)
    }
    fetchModules()
  }, [])

  const hasDocs = modules.includes("docs")
  const hasHR = modules.includes("hr")
  const canSwitch = modules.length > 1

  const logoContent = (
    <div className="text-2xl flex items-center select-none">
      {isHR ? (
        <>
          <span className="font-medium text-foreground/80">e</span>
          <span className="font-semibold text-primary">ai</span>
          <span className="font-medium text-foreground/80">sy</span>
          <span className="font-medium text-primary">HR</span>
        </>
      ) : (
        <>
          <span className="font-medium text-foreground/80">e</span>
          <span className="font-semibold text-primary">ai</span>
          <span className="font-medium text-foreground/80">sy</span>
          <span className="font-medium text-primary">Docs</span>
        </>
      )}
    </div>
  )

  if (loading) return <div className="p-2 h-10"></div>

  if (!canSwitch) {
    return (
      <div className="flex items-center gap-2 p-2 w-full">
        {logoContent}
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-muted/50 p-2 rounded-md transition-colors outline-none w-full justify-between">
        {logoContent}
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        {hasDocs && (
          <DropdownMenuItem render={<Link href="/" className="w-full cursor-pointer flex flex-col items-start gap-1" />}>
            <div className="text-base flex items-center">
              <span className="font-medium text-foreground/80">e</span>
              <span className="font-semibold text-primary">ai</span>
              <span className="font-medium text-foreground/80">sy</span>
              <span className="font-medium text-primary">Docs</span>
            </div>
            <span className="text-xs text-muted-foreground">Iratkezelő Rendszer</span>
          </DropdownMenuItem>
        )}
        {hasHR && (
          <DropdownMenuItem render={<Link href="/hr" className="w-full cursor-pointer flex flex-col items-start gap-1" />}>
            <div className="text-base flex items-center">
              <span className="font-medium text-foreground/80">e</span>
              <span className="font-semibold text-primary">ai</span>
              <span className="font-medium text-foreground/80">sy</span>
              <span className="font-medium text-primary">HR</span>
            </div>
            <span className="text-xs text-muted-foreground">HR Menedzsment</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
