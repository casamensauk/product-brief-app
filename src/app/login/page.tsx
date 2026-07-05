"use client"
import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"


export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  const handleSocialLogin = async () => {
    await authClient.signIn.social({
      provider: "github",
      callbackURL: "/dashboard"
    })
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (isSignUp) {
      const { data, error } = await authClient.signUp.email({
        email,
        password,
        name: email.split("@")[0],
        callbackURL: "/dashboard"
      })
      setLoading(false)
      if (error) {
        alert(error.message || "Failed to sign up")
      } else {
        window.location.href = "/dashboard"
      }
    } else {
      const { data, error } = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/dashboard"
      })
      setLoading(false)
      if (error) {
        alert(error.message || "Failed to sign in")
      } else {
        window.location.href = "/dashboard"
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Developer Dashboard</CardTitle>
          <CardDescription>{isSignUp ? "Create an account to continue" : "Sign in to review product briefs"}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : isSignUp ? "Sign Up" : "Sign In"}
            </Button>
          </form>

          <div className="text-center text-sm">
            <button 
              type="button" 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary hover:underline"
            >
              {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button onClick={handleSocialLogin} variant="outline" className="w-full">
            <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><title>GitHub</title><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
            GitHub
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
