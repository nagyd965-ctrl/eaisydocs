"use client"

import * as React from "react"
import { Home, Users, Calendar, Briefcase, FileText, Settings, UserPlus, Presentation, LayoutList, Target, FileBarChart2, ShieldAlert, FileSignature } from "lucide-react"
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
    url: "/hr",
    icon: Home,
  },
  {
    title: "Dolgozói portál",
    url: "/hr/self-service",
    icon: Users,
  },
  {
    title: "Vezetői nézet",
    url: "/hr/manager",
    icon: Briefcase,
  },
  {
    title: "Naptár & Távollét",
    url: "/hr/time",
    icon: Calendar,
  },
  {
    title: "HR Munkaasztal",
    url: "/hr/admin",
    icon: FileText,
  },
  {
    title: "Riportok (KSH / NAV)",
    url: "/hr/reports",
    icon: FileBarChart2,
  },
  {
    title: "Toborzás (ATS)",
    url: "/hr/recruitment",
    icon: UserPlus,
  },
  {
    title: "Onboarding",
    url: "/hr/onboarding",
    icon: Presentation,
  },
  {
    title: "Compliance",
    url: "/hr/compliance",
    icon: FileSignature,
  },
  {
    title: "Teljesítményértékelés",
    url: "/hr/performance",
    icon: Target,
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
