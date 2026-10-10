"use client"

import * as React from "react"
import { Home, Inbox, Archive, FolderOpen, Search, Users, CheckSquare, Sliders, ShieldAlert } from "lucide-react"
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
import { CompanySelector } from "@/components/company-selector"

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
    allowedRoles: ["admin", "rendszergazda", "iktato", "vezeto", "ugyintezo", "auditor"],
  },
  {
    title: "Iktatókönyv",
    url: "/dossiers",
    icon: FolderOpen,
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
  {
    title: "Szabályok",
    url: "/rules",
    icon: Sliders,
    allowedRoles: ["admin", "rendszergazda", "iktato", "vezeto", "ugyintezo"],
  },
  {
    title: "Eseménynapló",
    url: "/audit",
    icon: ShieldAlert,
    allowedRoles: ["admin", "rendszergazda", "auditor", "vezeto"],
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
      <SidebarHeader className="flex justify-center flex-col px-2 py-2.5 border-b gap-1.5">
        <ModuleSwitcher />
        <CompanySelector />
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
