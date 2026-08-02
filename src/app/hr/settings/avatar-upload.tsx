"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Camera, Upload } from "lucide-react"
import { uploadAvatar } from "@/app/settings/settings-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

function getInitials(name: string): string {
  return (name || "?")
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?"
}

export function AvatarUploadSection({
  name,
  avatarUrl,
}: {
  name: string
  avatarUrl?: string | null
}) {
  const router = useRouter()
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Túl nagy fájl", { description: "A profilkép maximum 5MB lehet." })
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleUpload() {
    if (!avatarFile) return
    setUploading(true)
    const data = new FormData()
    data.append("avatar", avatarFile)
    const res = await uploadAvatar(data)
    setUploading(false)
    if (res?.error) {
      toast.error("Profilkép hiba", { description: res.error })
    } else {
      toast.success("Sikeres feltöltés!", { description: "A profilkép sikeresen frissítve." })
      setAvatarFile(null)
      router.refresh()
      window.dispatchEvent(new Event("profileUpdated"))
    }
  }

  const displaySrc = avatarPreview || avatarUrl || null
  const initials = getInitials(name)

  return (
    <div className="flex items-center gap-5 pb-6 border-b border-border">
      {/* Avatar kör */}
      <div
        className="relative h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center cursor-pointer group border-2 border-transparent hover:border-primary/40 transition-colors shrink-0 overflow-hidden"
        onClick={() => fileInputRef.current?.click()}
      >
        {displaySrc ? (
          <img src={displaySrc} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xl font-semibold text-primary">{initials}</span>
        )}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
          <Camera className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Leírás + gombok */}
      <div>
        <p className="text-sm font-medium">Profilkép</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Kattints az avatárra vagy a gombra a feltöltéshez. JPG, PNG — max 5MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAvatarSelect}
        />
        <div className="flex items-center gap-2 mt-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-3.5 h-3.5" />
            Kép kiválasztása
          </Button>
          {avatarFile && (
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? "Feltöltés..." : "Mentés"}
            </Button>
          )}
        </div>
        {avatarFile && (
          <p className="text-[11px] text-success mt-1.5">✓ {avatarFile.name} kiválasztva</p>
        )}
      </div>
    </div>
  )
}
