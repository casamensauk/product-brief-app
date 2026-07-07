"use client"
import { useSyncExternalStore } from "react"
import { LogOut, Monitor, Moon, Sun, UserIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const

// false during SSR / first render, true after hydration — no setState needed.
function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}

export function UserMenu({ name, email }: { name: string; email: string }) {
  const { theme, setTheme } = useTheme()
  const mounted = useMounted()

  const handleSignOut = async () => {
    await authClient.signOut()
    window.location.assign("/login")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserIcon className="size-3.5" />
            </span>
            <span className="hidden max-w-40 truncate sm:inline">{name}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="truncate font-medium">{name}</div>
            <div className="truncate text-xs font-normal text-muted-foreground">
              {email}
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Theme
          </DropdownMenuLabel>
          {THEMES.map((t) => (
            <DropdownMenuItem
              key={t.value}
              onClick={() => setTheme(t.value)}
              closeOnClick={false}
            >
              <t.icon className="size-4" />
              {t.label}
              {mounted && theme === t.value && (
                <span className="ml-auto text-xs text-primary">Active</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
