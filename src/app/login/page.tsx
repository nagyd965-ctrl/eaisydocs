import { login, loginWithProvider } from "./actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default async function LoginPage(props: {
  searchParams: Promise<{ message?: string }>
}) {
  const searchParams = await props.searchParams

  const loginWithGoogleAction = loginWithProvider.bind(null, "google")
  const loginWithMicrosoftAction = loginWithProvider.bind(null, "azure")
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <Card className="mx-auto max-w-sm w-full border border-border/50 shadow-none">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold flex items-center justify-center gap-1 mb-2">
            <span className="text-foreground/80">e</span>
            <span className="text-primary">ai</span>
            <span className="text-foreground/80">sy</span>
            <span className="text-primary">Docs</span>
          </CardTitle>
          <CardDescription>
            Kérjük, jelentkezz be a rendszer használatához
          </CardDescription>
        </CardHeader>
        <form action={login}>
          <CardContent className="space-y-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail cím</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="minta@ceged.hu"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Jelszó</Label>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                required 
              />
            </div>
            {searchParams?.message && (
              <div className="text-sm font-medium text-destructive text-center">
                {searchParams.message}
              </div>
            )}
          </CardContent>
          <CardFooter className="pb-2">
            <Button className="w-full" type="submit">
              Bejelentkezés
            </Button>
          </CardFooter>
        </form>

        <div className="px-6 pb-6 space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-card px-2 text-muted-foreground">Vagy folytasd céges fiókkal</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {/* Microsoft Entra ID (Azure AD) SSO */}
            <form action={loginWithMicrosoftAction}>
              <Button type="submit" variant="outline" className="w-full font-normal border-border/50 hover:bg-muted/50 text-xs">
                <svg className="mr-2 h-3.5 w-3.5" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 0H11V11H0V0Z" fill="#F25022"/>
                  <path d="M12 0H23V11H12V0Z" fill="#7FBA00"/>
                  <path d="M0 12H11V23H0V12Z" fill="#00A4EF"/>
                  <path d="M12 12H23V23H12V12Z" fill="#FFB900"/>
                </svg>
                Microsoft Entra ID belépés
              </Button>
            </form>

            {/* Google Workspace SSO */}
            <form action={loginWithGoogleAction}>
              <Button type="submit" variant="outline" className="w-full font-normal border-border/50 hover:bg-muted/50 text-xs">
                <svg className="mr-2 h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Google Workspace belépés
              </Button>
            </form>
          </div>
        </div>
      </Card>
    </div>
  )
}
