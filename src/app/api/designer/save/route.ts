import { NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { sanitizeSlug } from '@/lib/slug'

export async function POST(request: Request) {
  const body = await request.json()
  const { name, category, set, steps } = body as { name?: unknown; category?: unknown; set?: unknown; steps?: unknown }

  if (typeof name !== 'string' || !name.trim() || !Array.isArray(steps)) {
    return NextResponse.json({ error: 'Missing name or steps' }, { status: 400 })
  }

  const safeName = sanitizeSlug(name)
  const dir = path.join(process.cwd(), 'designer-output')
  const filename = `${safeName}.json`

  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, filename), JSON.stringify({ category, set, steps }, null, 2))

  return NextResponse.json({ path: `designer-output/${filename}` })
}
