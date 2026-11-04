"use client"

import * as React from "react"
import { Home, Inbox, Archive, FolderOpen, Users, CheckSquare, Sliders, ShieldAlert } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { normalizeDocsRoleAndModules, type DocsModuleKey } from "@/utils/hr/company-role-resolver"

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

interface DocsNavItem {
  title: string
  url: string
  icon: any
  moduleKey?: DocsModuleKey
}

const items: DocsNavItem[] = [
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
    moduleKey: "inbox",
  },
  {
    title: "Iktatókönyv",
    url: "/dossiers",
    icon: FolderOpen,
    moduleKey: "dossiers",
  },
  {
    title: "Irattár",
    url: "/archive",
    icon: Archive,
    moduleKey: "archive",
  },
  {
    title: "Partnerek",
    url: "/partners",
    icon: Users,
    moduleKey: "partners",
  },
  {
    title: "Szabályok",
    url: "/rules",
    icon: Sliders,
    moduleKey: "rules",
  },
  {
    title: "Eseménynapló",
    url: "/audit",
    icon: ShieldAlert,
    moduleKey: "audit",
  },
]

export function AppSidebar({
  docsRole = "munkavallalo",
  docsModules = [],
}: {
  docsRole?: string
  docsModules?: string[]
}) {
  const pathname = usePathname()

  const normalized = normalizeDocsRoleAndModules(docsRole, docsModules)
  const role = normalized.role
  const activeModuleSet = new Set<string>(normalized.modules)

  const filteredItems = items.filter((item) => {
    if (!item.moduleKey) return true
    if (role === "admin") return true
    return activeModuleSet.has(item.moduleKey)
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
