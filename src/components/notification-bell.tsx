"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDistanceToNow } from "date-fns"
import { hu } from "date-fns/locale"

interface AppNotification {
  id: string
  cim: string
  szoveg: string | null
  olvasott: boolean
  link_url: string | null
  created_at: string
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const fetchNotifications = useCallback(async () => {
    const supabase = createClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const { data } = await supabase
      .from("alkalmazas_ertesites")
      .select("*")
      .eq("user_id", userData.user.id)
      .eq("olvasott", false)
      .order("created_at", { ascending: false })
      .limit(20)

    if (data) {
      setNotifications(data)
      setUnreadCount(data.filter((n) => !n.olvasott).length)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      if (isMounted) {
        await fetchNotifications()
      }
    }
    load()

    // Opcionális: Polling beállítása percenként
    const interval = setInterval(fetchNotifications, 60000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [fetchNotifications])

  const deleteNotification = async (id: string, wasUnread: boolean) => {
    const supabase = createClient()
    const { error } = await supabase
      .from("alkalmazas_ertesites")
      .update({ olvasott: true })
      .eq("id", id)

    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    }
  }

  const handleNotificationClick = (notif: AppNotification) => {
    deleteNotification(notif.id, !notif.olvasott)
    setIsOpen(false)
    if (notif.link_url) {
      router.push(notif.link_url)
    }
  }

  return (
    <Popover modal={false} open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full outline-none hover:bg-muted focus:outline-none focus-visible:ring-0 text-muted-foreground transition-colors">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 shadow-lg border">
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
          <h4 className="font-semibold text-sm">Értesítési központ</h4>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">{unreadCount} olvasatlan</span>
          )}
        </div>
        
        <ScrollArea className="h-[300px] bg-background">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center space-y-3 text-muted-foreground">
              <Bell className="h-8 w-8 opacity-20" />
              <p className="text-sm">Nincs új értesítés.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`flex flex-col p-4 border-b last:border-0 cursor-pointer transition-colors hover:bg-muted/50 ${
                    !notif.olvasott ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-sm ${!notif.olvasott ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>
                      {notif.cim}
                    </span>
                    {!notif.olvasott && (
                      <span className="flex h-2 w-2 rounded-full bg-primary mt-1.5" />
                    )}
                  </div>
                  {notif.szoveg && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {notif.szoveg}
                    </p>
                  )}
                  <span className="text-[10px] text-muted-foreground/70 mt-2">
                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: hu })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
