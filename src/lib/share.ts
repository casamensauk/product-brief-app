import { useSyncExternalStore } from "react"

const emptySubscribe = () => () => {}

/** Origin resolved after hydration (empty on the server) — SSR-safe. */
export function useOrigin(): string {
  return useSyncExternalStore(
    emptySubscribe,
    () => window.location.origin,
    () => ""
  )
}

/**
 * Absolute URL a client uses to open the questionnaire. The server render
 * (and first client render) shows the path only; the origin appears once
 * hydrated — SSR-safe with no hydration mismatch.
 */
export function useShareUrl(token: string): string {
  return `${useOrigin()}/q/${token}`
}

/** Absolute URL of the public read-only brief share page. */
export function briefShareUrl(token: string): string {
  return `${window.location.origin}/brief/${token}`
}

export function shareUrl(token: string): string {
  return `${window.location.origin}/q/${token}`
}

export async function copyShareLink(token: string): Promise<void> {
  await navigator.clipboard.writeText(shareUrl(token))
}
