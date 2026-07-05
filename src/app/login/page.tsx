"use client"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function LoginPage() {
  const handleLogin = async () => {
    await authClient.signIn.social({
      provider: "github",
      callbackURL: "/dashboard"
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Developer Dashboard</CardTitle>
          <CardDescription>Sign in to review product briefs</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={handleLogin} size="lg" className="w-full">
            Sign in with GitHub
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
