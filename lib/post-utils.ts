export function sanitizePostSlugInput(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/_{2,}/g, '_')
}

export function normalizePostSlug(value: string): string {
  return sanitizePostSlugInput(value)
    .replace(/^[-_]+|[-_]+$/g, '')
}

export function buildAutoDescription(value: string, maxLength = 160): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  return normalized.slice(0, maxLength)
}
