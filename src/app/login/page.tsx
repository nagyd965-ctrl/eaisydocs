import { login } from "./actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default async function LoginPage(props: {
  searchParams: Promise<{ message?: string }>
}) {
  const searchParams = await props.searchParams
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <Card className="mx-auto max-w-sm w-full">
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
          <CardContent className="space-y-4">
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
          <CardFooter>
            <Button className="w-full" type="submit">
              Bejelentkezés
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
