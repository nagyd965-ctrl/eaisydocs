"use client"

import * as React from "react"
import { Home, Inbox, Archive, Settings, FolderOpen, Search, Users } from "lucide-react"
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

const items = [
  {
    title: "Áttekintés",
    url: "/",
    icon: Home,
  },
  {
    title: "Bejövő sor",
    url: "/inbox",
    icon: Inbox,
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

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="h-16 flex justify-center flex-col px-4 border-b">
        <div className="text-2xl flex items-center">
          <span className="font-medium text-foreground/80">e</span>
          <span className="font-semibold text-primary">ai</span>
          <span className="font-medium text-foreground/80">sy</span>
          <span className="font-medium text-primary">Docs</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Főmenü</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
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
