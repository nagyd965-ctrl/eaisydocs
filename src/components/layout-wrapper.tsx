"use client"
import { usePathname } from "next/navigation"
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { HrSidebar } from "@/components/hr-sidebar"
import { SessionTimeout } from "./session-timeout"
import { NotificationBell } from "./notification-bell"
import { GlobalHeaderSearch } from "./global-header-search"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"

function DynamicSidebarTrigger() {
  const { state, isMobile } = useSidebar()
  
  if (state === "expanded" && !isMobile) return null

  return <SidebarTrigger className="-ml-2" />
}


export function LayoutWrapper({ 
  children, 
  docsRole,
  hrRole
}: { 
  children: React.ReactNode; 
  docsRole?: string;
  hrRole?: string;
}) {
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

  if (pathname === "/login" || pathname.startsWith("/auth") || pathname.startsWith("/embed") || pathname.startsWith("/archive/print") || pathname.startsWith("/karrier")) {
    return (
      <main className="flex-1 w-full flex flex-col bg-slate-50 print:bg-white h-screen">
        {children}
      </main>
    )
  }
  
  return (
    <SidebarProvider>
      <div className="print:hidden h-full flex flex-col z-50">
        {pathname.startsWith("/hr") ? <HrSidebar hrRole={hrRole} /> : <AppSidebar docsRole={docsRole} />}
      </div>
      {timeoutMinutes && <SessionTimeout timeoutMinutes={timeoutMinutes} />}
      <main className="flex-1 w-full overflow-hidden flex flex-col relative print:overflow-visible">
        <div className="flex h-14 items-center justify-between px-4 md:px-8 shrink-0 border-b print:hidden">
          <div className="flex items-center">
            <DynamicSidebarTrigger />
          </div>
          <div className="flex items-center space-x-3">
            <GlobalHeaderSearch />
            <NotificationBell />
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
