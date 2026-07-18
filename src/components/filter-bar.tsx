"use client"

import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTransition, useState, useEffect } from "react"

export function FilterBar({ placeholder = "Keresés..." }: { placeholder?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [value, setValue] = useState(searchParams.get("q") || "")

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set("q", value)
      } else {
        params.delete("q")
      }
      
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [value]) // Csak a value változására fusson le, hogy elkerüljük az infinite loopot

  return (
    <div className="relative w-full min-w-[300px] md:min-w-[350px] max-w-lg">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        className="pl-8 bg-background"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  )
}
