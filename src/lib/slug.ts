export function sanitizeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// 'ho-stack-initiation' -> 'hoStackInitiation', matching the export const
// naming convention used across src/data/plays/*.ts.
export function toCamelCase(slug: string): string {
  return slug.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase())
}
