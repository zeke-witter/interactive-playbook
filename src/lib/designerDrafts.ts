export function sanitizeDraftName(name: string): string {
  return name.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
}
