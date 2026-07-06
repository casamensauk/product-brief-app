import { SIGNUP_ALLOWED } from "@/lib/auth"
import { LoginForm } from "@/components/login-form"

// Read ALLOW_SIGNUP at request time, not build time.
export const dynamic = "force-dynamic"

export default function LoginPage() {
  return <LoginForm allowSignUp={SIGNUP_ALLOWED} />
}
