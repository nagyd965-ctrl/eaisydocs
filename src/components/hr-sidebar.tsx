"use client"

import * as React from "react"
import { Users, Briefcase, FileText, Target, ShieldAlert, ShieldCheck, ChevronDown } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { normalizeHrRoleAndModules } from "@/utils/hr/company-role-resolver"

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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { SidebarFooterContent } from "@/components/sidebar-footer-content"
import { ModuleSwitcher } from "@/components/module-switcher"
import { CompanySelector } from "@/components/company-selector"

interface HrNavSubItem {
  title: string
  url: string
  moduleKey?: string
}

interface HrNavItem {
  title: string
  url: string
  icon: any
  moduleKey?: string
  adminOnly?: boolean
  items?: HrNavSubItem[]
}

const items: HrNavItem[] = [
  {
    title: "Dolgozói Portál",
    url: "/hr",
    icon: Users,
    items: [
      { title: "Áttekintés", url: "/hr" },
      { title: "Profilom", url: "/hr/self-service/profile" },
      { title: "Dokumentumaim", url: "/hr/self-service/documents" },
      { title: "Jelenlét", url: "/hr/self-service/time" },
      { title: "Célkitűzések", url: "/hr/self-service/goals" },
      { title: "Fejlődési Tervem", url: "/hr/self-service/idp" },
      { title: "Bérpapírjaim", url: "/hr/self-service/payroll" },
      { title: "Belső Állások", url: "/hr/self-service/career" },
    ],
  },
  {
    title: "Vezetői nézet",
    url: "/hr/manager",
    icon: Briefcase,
    items: [
      { title: "Csapat áttekintés", url: "/hr/manager" },
      { title: "Teljesítményértékelés", url: "/hr/performance" },
    ],
  },
  {
    title: "HR Munkaasztal",
    url: "/hr/admin",
    icon: FileText,
    items: [
      { title: "Állomány áttekintés", url: "/hr/admin", moduleKey: "admin" },
      { title: "Szervezeti Felépítés", url: "/hr/organization", moduleKey: "organization" },
      { title: "Műszakbeosztás", url: "/hr/time", moduleKey: "time" },
      { title: "Bérszámfejtés", url: "/hr/payroll", moduleKey: "payroll" },
      { title: "Munkaügyi Megfelelőség", url: "/hr/compliance", moduleKey: "compliance" },
      { title: "Riportok", url: "/hr/reports", moduleKey: "reports" },
    ],
  },
  {
    title: "Dolgozói Életút",
    url: "/hr/recruitment",
    icon: Target,
    items: [
      { title: "Toborzás", url: "/hr/recruitment", moduleKey: "recruitment" },
      { title: "Onboarding", url: "/hr/onboarding", moduleKey: "onboarding" },
      { title: "Offboarding", url: "/hr/offboarding", moduleKey: "offboarding" },
    ],
  },
  {
    title: "Eseménynapló",
    url: "/hr/audit",
    icon: ShieldAlert,
    moduleKey: "audit",
  },
]

export function HrSidebar({
  hrRole = "munkavallalo",
  hrModules = [],
}: {
  hrRole?: string
  hrModules?: string[]
}) {
  const pathname = usePathname()

  const normalized = normalizeHrRoleAndModules(hrRole, hrModules)
  const role = normalized.role
  const activeModuleSet = new Set<string>(normalized.modules)

  const filteredItems = items
    .map((item): HrNavItem | null => {
      // 1. Dolgozói Portál mindenkinek elérhető
      if (item.title === "Dolgozói Portál") {
        return item
      }

      // 2. Jogosultságkezelő kizárólag Adminnak
      if (item.adminOnly) {
        return role === "admin" ? item : null
      }

      // 3. Vezetői nézet: Vezetőnek, Adminnak, vagy akinek be van kapcsolva az Állomány ('admin') modul
      if (item.title === "Vezetői nézet") {
        if (role === "admin" || role === "vezeto" || activeModuleSet.has("admin")) {
          return item
        }
        return null
      }

      // 4. HR Munkaasztal és Dolgozói Életút: almenük szűrése az engedélyezett modulok alapján
      if (item.items && item.items.length > 0) {
        const allowedSubs = item.items.filter((sub) => {
          if (role === "admin") return true
          if (!sub.moduleKey) return true
          return activeModuleSet.has(sub.moduleKey)
        })
        if (allowedSubs.length === 0) return null
        return {
          ...item,
          url: allowedSubs[0].url,
          items: allowedSubs,
        }
      }

      // 5. Önálló modul-oldal (pl. Eseménynapló)
      if (item.moduleKey) {
        return role === "admin" || activeModuleSet.has(item.moduleKey) ? item : null
      }

      return null
    })
    .filter((item): item is HrNavItem => item !== null)

  return (
    <Sidebar>
      <SidebarHeader className="flex justify-center flex-col px-2 py-2.5 border-b gap-1.5">
        <ModuleSwitcher />
        <CompanySelector />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>HR Modulok</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => {
                const isActive = pathname === item.url || (item.url !== "/hr" && pathname.startsWith(item.url + "/"))
                if (item.items && item.items.length > 0) {
                  const isGroupActive =
                    isActive ||
                    item.items.some(
                      (sub) => pathname === sub.url || (sub.url !== "/hr" && pathname.startsWith(sub.url + "/"))
                    )
                  return (
                    <Collapsible key={item.title} defaultOpen={isGroupActive} className="group/collapsible">
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={item.title} isActive={isGroupActive}>
                            <item.icon />
                            <span>{item.title}</span>
                            <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                          <SidebarMenuSub className="pr-0 mr-0 mt-1">
                            {item.items.map((subItem) => {
                              const isSubActive =
                                pathname === subItem.url ||
                                (subItem.url !== "/hr" &&
                                  subItem.url !== "/hr/admin" &&
                                  pathname.startsWith(subItem.url + "/"))
                              return (
                                <SidebarMenuSubItem key={subItem.title} className="relative">
                                  {isSubActive && (
                                    <div className="absolute -left-4 top-1.5 bottom-1.5 w-[3px] bg-primary rounded-r-md z-10" />
                                  )}
                                  <SidebarMenuSubButton render={<Link href={subItem.url} />} isActive={isSubActive}>
                                    <span className={isSubActive ? "font-semibold text-primary" : ""}>
                                      {subItem.title}
                                    </span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              )
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  )
                }

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
