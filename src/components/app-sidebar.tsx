"use client"

import * as React from "react"
import { Home, Inbox, Archive, FolderOpen, Search, Users, CheckSquare } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { SidebarFooterContent } from "@/components/sidebar-footer-content"
import { ModuleSwitcher } from "@/components/module-switcher"

const items = [
  {
    title: "Áttekintés",
    url: "/",
    icon: Home,
  },
  {
    title: "Saját feladataim",
    url: "/tasks",
    icon: CheckSquare,
  },
  {
    title: "Bejövő sor",
    url: "/inbox",
    icon: Inbox,
    allowedRoles: ["admin", "rendszergazda", "iktato", "vezeto", "auditor"],
  },
  {
    title: "Iktatókönyv",
    url: "/dossiers",
    icon: FolderOpen,
  },
  {
    title: "Kereső",
    url: "/search",
    icon: Search,
  },
  {
    title: "Irattár",
    url: "/archive",
    icon: Archive,
  },
  {
    title: "Partnerek",
    url: "/partners",
    icon: Users,
  },
]

export function AppSidebar({ docsRole = "ugyintezo" }: { docsRole?: string }) {
  const pathname = usePathname()

  const filteredItems = items.filter((item) => {
    if (!item.allowedRoles) return true
    return item.allowedRoles.includes(docsRole)
  })

  return (
    <Sidebar>
      <SidebarHeader className="h-16 flex justify-center flex-col px-4 border-b">
        <ModuleSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Főmenü</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => {
                const isActive = pathname === item.url || (item.url !== "/" && pathname.startsWith(item.url))
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton render={<Link href={item.url} />} isActive={isActive} tooltip={item.title}>
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-0">
        <SidebarFooterContent />
      </SidebarFooter>
    </Sidebar>
  )
}
