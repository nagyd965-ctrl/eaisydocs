"use client"

import * as React from "react"
import { Home, Users, Calendar, Briefcase, FileText, UserPlus, Presentation, Target, FileBarChart2, ShieldAlert, ChevronDown, UserMinus } from "lucide-react"
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { SidebarFooterContent } from "@/components/sidebar-footer-content"
import { ModuleSwitcher } from "@/components/module-switcher"
import { CompanySelector } from "@/components/company-selector"

const items = [

  {
    title: "Dolgozói Portál",
    url: "/hr",
    icon: Users,
    items: [
      {
        title: "Áttekintés",
        url: "/hr",
      },
      {
        title: "Profilom",
        url: "/hr/self-service/profile",
      },
      {
        title: "Dokumentumaim",
        url: "/hr/self-service/documents",
      },
      {
        title: "Jelenlét",
        url: "/hr/self-service/time",
      },
      {
        title: "Célkitűzések",
        url: "/hr/self-service/goals",
      },
      {
        title: "Fejlődési Tervem",
        url: "/hr/self-service/idp",
      },
      {
        title: "Bérpapírjaim",
        url: "/hr/self-service/payroll",
      },
      {
        title: "Belső Állások",
        url: "/hr/self-service/career",
      },
    ]
  },
  {
    title: "Vezetői nézet",
    url: "/hr/manager",
    icon: Briefcase,
    items: [
      {
        title: "Csapat áttekintés",
        url: "/hr/manager",
      },
      {
        title: "Teljesítményértékelés",
        url: "/hr/performance",
      }
    ]
  },
  {
    title: "HR Munkaasztal",
    url: "/hr/admin",
    icon: FileText,
    items: [
      {
        title: "Állomány áttekintés",
        url: "/hr/admin",
      },
      {
        title: "Szervezeti Felépítés",
        url: "/hr/organization",
      },
      {
        title: "Műszakbeosztás",
        url: "/hr/time",
      },
      {
        title: "Bérszámfejtés",
        url: "/hr/payroll",
      },
      {
        title: "Munkaügyi Megfelelőség",
        url: "/hr/compliance",
      },
      {
        title: "Riportok",
        url: "/hr/reports",
      }
    ]
  },
  {
    title: "Dolgozói Életút",
    url: "/hr/recruitment",
    icon: Target,
    items: [
      {
        title: "Toborzás",
        url: "/hr/recruitment",
      },
      {
        title: "Onboarding",
        url: "/hr/onboarding",
      },
      {
        title: "Offboarding",
        url: "/hr/offboarding",
      }
    ]
  },
  {
    title: "Eseménynapló",
    url: "/hr/audit",
    icon: ShieldAlert,
  }
]

export function HrSidebar({ hrRole = "munkavallalo" }: { hrRole?: string }) {
  const pathname = usePathname()

  // Szerepkör alapú menüszűrés és almenü-testreszabás
  const filteredItems = items
    .map(item => {
      // 1. Admin, HR vezető, HR munkatárs, rendszergazda, auditor mindent lát
      if (["admin", "hr_vezeto", "hr_munkatars", "rendszergazda", "auditor"].includes(hrRole)) {
        return item
      }

      // 2. Vezető csak a Dolgozói Portált és a Vezetői nézetet látja
      if (hrRole === "vezeto") {
        if (item.title === "Dolgozói Portál" || item.title === "Vezetői nézet") {
          return item
        }
        return null
      }

      // 3. Bérügyi munkatárs: Dolgozói Portál + Bérügyi releváns HR Munkaasztal modulok
      if (hrRole === "berugyi") {
        if (item.title === "Dolgozói Portál") return item
        if (item.title === "HR Munkaasztal") {
          return {
            ...item,
            items: item.items?.filter(sub => 
              ["/hr/admin", "/hr/payroll", "/hr/time", "/hr/reports", "/hr/organization"].includes(sub.url)
            )
          }
        }
        return null
      }

      // 4. Munkavédelmi felelős: Dolgozói Portál + Munkaügyi/Munkavédelmi Megfelelőség és Állomány
      if (hrRole === "munkavedelmi") {
        if (item.title === "Dolgozói Portál") return item
        if (item.title === "HR Munkaasztal") {
          return {
            ...item,
            items: item.items?.filter(sub => 
              ["/hr/admin", "/hr/compliance"].includes(sub.url)
            )
          }
        }
        return null
      }

      // 5. Toborzó (ATS): Dolgozói Portál + csak Toborzás (a zárt Onboarding/Offboarding nélkül)
      if (hrRole === "toborzo") {
        if (item.title === "Dolgozói Portál") return item
        if (item.title === "Dolgozói Életút") {
          return {
            ...item,
            items: item.items?.filter(sub => sub.url === "/hr/recruitment")
          }
        }
        return null
      }

      // 6. Munkavállaló és fallback: kizárólag Dolgozói Portál
      if (item.title === "Dolgozói Portál") {
        return item
      }

      return null
    })
    .filter((item): item is (typeof items)[0] => item !== null)

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
                  const isGroupActive = isActive || item.items.some(sub => pathname === sub.url || (sub.url !== "/hr" && pathname.startsWith(sub.url + "/")))
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
                            {item.items.map(subItem => {
                              const isSubActive = pathname === subItem.url || (subItem.url !== "/hr" && subItem.url !== "/hr/admin" && pathname.startsWith(subItem.url + "/"))
                              return (
                                <SidebarMenuSubItem key={subItem.title} className="relative">
                                  {isSubActive && <div className="absolute -left-4 top-1.5 bottom-1.5 w-[3px] bg-primary rounded-r-md z-10" />}
                                  <SidebarMenuSubButton render={<Link href={subItem.url} />} isActive={isSubActive}>
                                    <span className={isSubActive ? "font-semibold text-primary" : ""}>{subItem.title}</span>
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
