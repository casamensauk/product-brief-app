export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024 // 5 MB
export const MAX_ATTACHMENTS_PER_BRIEF = 5

/** Accepted MIME type -> allowed filename extensions (without the dot). */
const ALLOWED_TYPES: Record<string, string[]> = {
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
  "application/pdf": ["pdf"],
}

export const ACCEPT_ATTR = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf"].join(",")

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".")
  return dot === -1 ? "" : filename.slice(dot + 1).toLowerCase()
}

/**
 * Validate an uploaded file's declared type and filename extension against
 * the whitelist. Both must agree — this blocks e.g. a .html file relabeled
 * with an image/* content-type.
 */
export function validateAttachmentType(
  filename: string,
  mimeType: string
): { ok: true } | { ok: false; reason: string } {
  const allowedExtensions = ALLOWED_TYPES[mimeType]
  if (!allowedExtensions) {
    return {
      ok: false,
      reason: "Only PNG, JPEG, WEBP, GIF images or PDF files are accepted.",
    }
  }
  if (!allowedExtensions.includes(extensionOf(filename))) {
    return {
      ok: false,
      reason: "The file extension doesn't match its type.",
    }
  }
  return { ok: true }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
