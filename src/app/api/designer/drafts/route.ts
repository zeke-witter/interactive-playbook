import { NextResponse } from 'next/server'
import { readdir } from 'fs/promises'
import path from 'path'

export async function GET() {
  const dir = path.join(process.cwd(), 'designer-output')
  try {
    const files = await readdir(dir)
    const drafts = files
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -'.json'.length))
      .sort()
    return NextResponse.json({ drafts })
  } catch {
    return NextResponse.json({ drafts: [] })
  }
}
