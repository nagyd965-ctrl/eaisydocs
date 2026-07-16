"use client"
import { usePathname } from "next/navigation"
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SessionTimeout } from "./session-timeout"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"

function DynamicSidebarTrigger() {
  const { state, isMobile } = useSidebar()
  
  if (state === "expanded" && !isMobile) return null

  return (
    <div className="flex h-14 items-center px-4 md:px-8 shrink-0">
      <SidebarTrigger className="-ml-2" />
    </div>
  )
}


export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [timeoutMinutes, setTimeoutMinutes] = useState<number | null>(null)
  
  useEffect(() => {
    async function getSettings() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('felhasznalo_profil').select('munkamenet_idotullepes').eq('id', user.id).single()
        if (data?.munkamenet_idotullepes) {
          setTimeoutMinutes(data.munkamenet_idotullepes)
        } else {
          setTimeoutMinutes(15)
        }
      }
    }
    
    if (pathname !== "/login") {
      getSettings()
    }

    const handleTimeoutChange = () => getSettings()
    window.addEventListener('sessionTimeoutChanged', handleTimeoutChange)
    
    return () => {
      window.removeEventListener('sessionTimeoutChanged', handleTimeoutChange)
    }
  }, [pathname])

  if (pathname === "/login" || pathname.startsWith("/embed") || pathname.startsWith("/archive/print")) {
    return (
      <main className="flex-1 w-full flex flex-col bg-white print:bg-white h-screen">
        {children}
      </main>
    )
  }
  
  return (
    <SidebarProvider>
      <AppSidebar />
      {timeoutMinutes && <SessionTimeout timeoutMinutes={timeoutMinutes} />}
      <main className="flex-1 w-full overflow-hidden flex flex-col relative">
        <DynamicSidebarTrigger />
        <div className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
