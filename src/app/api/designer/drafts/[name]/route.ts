import { NextResponse } from 'next/server'
import { readFile, unlink } from 'fs/promises'
import path from 'path'
import { sanitizeSlug } from '@/lib/slug'

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const safeName = sanitizeSlug(name)
  const filePath = path.join(process.cwd(), 'designer-output', `${safeName}.json`)

  try {
    const raw = await readFile(filePath, 'utf-8')
    return NextResponse.json(JSON.parse(raw))
  } catch {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const safeName = sanitizeSlug(name)
  const filePath = path.join(process.cwd(), 'designer-output', `${safeName}.json`)

  try {
    await unlink(filePath)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  }
}
