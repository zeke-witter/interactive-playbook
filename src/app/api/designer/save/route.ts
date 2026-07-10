import { NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

export async function POST(request: Request) {
  const body = await request.json()
  const { name, steps } = body as { name?: unknown; steps?: unknown }

  if (typeof name !== 'string' || !name.trim() || !Array.isArray(steps)) {
    return NextResponse.json({ error: 'Missing name or steps' }, { status: 400 })
  }

  const safeName = name.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dir = path.join(process.cwd(), 'designer-output')
  const filename = `${safeName}-${timestamp}.json`

  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, filename), JSON.stringify(steps, null, 2))

  return NextResponse.json({ path: `designer-output/${filename}` })
}
