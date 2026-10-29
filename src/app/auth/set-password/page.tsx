"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function SetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    // Ellenőrizzük, hogy van-e aktív munkamenet (akár cookie-ból, akár URL hashből)
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.email) {
          setUserEmail(session.user.email)
          setIsReady(true)
          return
        }

        // Ha a hash fragmentben érkezett a token (#access_token=...)
        if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
          // A Supabase kliens automatikusan elkapja a hash-t, adunk neki 500ms-t
          setTimeout(async () => {
            const { data: { session: hashSession } } = await supabase.auth.getSession()
            if (hashSession?.user?.email) {
              setUserEmail(hashSession.user.email)
            }
            setIsReady(true)
          }, 500)
          return
        }

        setIsReady(true)
      } catch (err) {
        console.error("Auth check error:", err)
        setIsReady(true)
      }
    }

    checkAuth()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!password || !confirmPassword) {
      setErrorMsg("Kérjük, töltsd ki mindkét jelszó mezőt!")
      return
    }

    if (password.length < 8) {
      setErrorMsg("A jelszónak legalább 8 karakter hosszúnak kell lennie!")
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg("A megadott jelszavak nem egyeznek!")
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        setErrorMsg(error.message || "Nem sikerült a jelszó frissítése.")
        setLoading(false)
        return
      }

      toast.success("Jelszó sikeresen beállítva!", {
        description: "Átirányítás a munkaterületre...",
      })

      setTimeout(() => {
        router.push("/")
        router.refresh()
      }, 1000)
    } catch (err: any) {
      console.error("Jelszó módosítási hiba:", err)
      setErrorMsg(err.message || "Váratlan hiba történt a jelszó mentésekor.")
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-8">
      <Card className="mx-auto max-w-md w-full border border-border/50 shadow-none bg-card">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-[26px] font-semibold leading-none tracking-tight flex items-center justify-center mb-3">
            <span className="font-medium text-foreground/80">e</span>
            <span className="font-bold text-primary">ai</span>
            <span className="font-medium text-foreground/80">sy</span>
          </CardTitle>
          <CardDescription className="text-sm">
            {userEmail ? (
              <>
                Jelszó beállítása a következő fiókhoz: <strong className="text-foreground">{userEmail}</strong>
              </>
            ) : (
              "Add meg az új jelszavadat a folytatáshoz."
            )}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {errorMsg && (
              <div className="flex items-center gap-2 p-3 text-xs rounded-md bg-destructive/10 text-destructive border border-destructive/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="new-password">Új jelszó</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  name="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Legalább 8 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || !isReady}
                  required
                  autoFocus
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Új jelszó megerősítése</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  name="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Ismételd meg az új jelszót"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading || !isReady}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-md bg-muted/40 text-xs text-muted-foreground space-y-1.5 border border-border/40">
              <div className="font-medium text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                Biztonsági követelmények:
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                <li className={password.length >= 8 ? "text-primary font-medium" : ""}>
                  Minimum 8 karakter hosszúság
                </li>
                <li className={password && confirmPassword && password === confirmPassword ? "text-primary font-medium" : ""}>
                  A két jelszó egyezik
                </li>
              </ul>
            </div>
          </CardContent>

          <CardFooter className="pt-2 pb-6">
            <Button className="w-full" type="submit" disabled={loading || !isReady}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Jelszó mentése...
                </>
              ) : (
                "Jelszó beállítása és belépés"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
