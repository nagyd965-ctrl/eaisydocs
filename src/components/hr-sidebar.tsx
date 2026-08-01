"use client"

import * as React from "react"
import { Home, Users, Calendar, Briefcase, FileText, UserPlus, Presentation, Target, FileBarChart2, ShieldAlert, FileSignature, ChevronDown, UserMinus } from "lucide-react"
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

const items = [
  {
    title: "Áttekintés",
    url: "/hr",
    icon: Home,
  },
  {
    title: "Dolgozói Portál",
    url: "/hr/self-service",
    icon: Users,
    items: [
      {
        title: "Áttekintés",
        url: "/hr/self-service",
      },
      {
        title: "Profilom",
        url: "/hr/self-service/profile",
      },
      {
        title: "Jelenlét & Szabadság",
        url: "/hr/self-service/time",
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
        title: "Naptár & Távollét",
        url: "/hr/time",
      },
      {
        title: "Riportok (KSH / NAV)",
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
        title: "Toborzás (ATS)",
        url: "/hr/recruitment",
      },
      {
        title: "Onboarding",
        url: "/hr/onboarding",
      },
      {
        title: "Kiléptetés",
        url: "/hr/offboarding",
      }
    ]
  },
  {
    title: "Compliance",
    url: "/hr/compliance",
    icon: FileSignature,
  },
  {
    title: "Eseménynapló (Audit)",
    url: "/hr/audit",
    icon: ShieldAlert,
  }
]

export function HrSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="h-16 flex justify-center flex-col px-4 border-b">
        <ModuleSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>HR Modulok</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = pathname === item.url || (item.url !== "/hr" && pathname.startsWith(item.url))
                if (item.items && item.items.length > 0) {
                  const isGroupActive = isActive || item.items.some(sub => pathname === sub.url || pathname.startsWith(sub.url))
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
                              const isSubActive = pathname === subItem.url || pathname.startsWith(subItem.url)
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
