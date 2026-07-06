import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { prisma } from "@/lib/prisma"
import { passwordResetEmail, sendEmail } from "@/lib/email"
import { getAgencyName } from "@/lib/settings"

/** Sign-up is allowed unless ALLOW_SIGNUP is explicitly "false". */
export const SIGNUP_ALLOWED = process.env.ALLOW_SIGNUP !== "false"

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    disableSignUp: !SIGNUP_ALLOWED,
    sendResetPassword: async ({ user, url }) => {
      const agencyName = await getAgencyName()
      const email = passwordResetEmail({ agencyName, url })
      await sendEmail({
        to: user.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      })
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  // Per-instance memory store (fine for single-instance deploys). Auth-sensitive
  // routes get stricter limits than the default.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
    storage: "memory",
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 60, max: 5 },
    },
  },
  plugins: [nextCookies()],
})

export type Session = typeof auth.$Infer.Session
