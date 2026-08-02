"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { type User } from "@supabase/supabase-js"
import { LogOut, Settings, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { useRouter, usePathname } from "next/navigation"

export function SidebarFooterContent() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()
  const { state, toggleSidebar } = useSidebar()

  useEffect(() => {
    const fetchProfile = () => {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          setUser(data.user)
          // Keresd meg a profilt is
          supabase
            .from("felhasznalo_profil")
            .select("nev, avatar_url")
            .eq("id", data.user.id)
            .single()
            .then(({ data: profileData }) => {
              if (profileData) {
                setProfile(profileData)
              }
            })
        }
      })
    }

    fetchProfile()

    window.addEventListener('profileUpdated', fetchProfile)
    return () => window.removeEventListener('profileUpdated', fetchProfile)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (!user) return null

  // Ha a sidebar össze van csukva, egy minimalista nézetet adunk vissza
  if (state === "collapsed") {
    const initials = profile?.nev ? profile.nev.substring(0, 2).toUpperCase() : user.email?.substring(0, 2).toUpperCase()
    return (
      <div className="flex flex-col items-center gap-4 py-2 border-t mt-auto">
        <div className="h-8 w-8 bg-muted rounded-full flex items-center justify-center font-medium text-xs overflow-hidden">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            : initials
          }
        </div>
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <PanelLeftOpen className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full">
      {/* Felhasználó infó + Theme toggle */}
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="h-10 w-10 shrink-0 bg-muted rounded-full flex items-center justify-center font-medium text-sm text-muted-foreground uppercase overflow-hidden">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              : (profile?.nev ? profile.nev.substring(0, 2) : user.email?.substring(0, 2))
            }
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate">{profile?.nev || "Felhasználó"}</span>
            <span className="text-xs text-muted-foreground truncate">{user.email}</span>
          </div>
        </div>
        <div className="shrink-0">
          <ThemeToggle />
        </div>
      </div>

      {/* Gombok */}
      <div className="grid grid-cols-2 gap-2 px-2 pb-2">
        <Link href={pathname.startsWith("/hr") ? "/hr/settings" : "/settings"} passHref>
          <Button variant="outline" size="sm" className="w-full text-muted-foreground hover:text-foreground">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
        <Button variant="outline" size="sm" className="w-full text-muted-foreground hover:text-foreground" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Vonal és összecsukó gomb */}
      <div className="border-t flex justify-center py-2 mt-1">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-muted-foreground hover:text-foreground">
          <PanelLeftClose className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
