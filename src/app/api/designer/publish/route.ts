import { NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'
import { Project, SyntaxKind } from 'ts-morph'
import { sanitizeSlug, toCamelCase } from '@/lib/slug'
import { buildPlay } from '@/lib/playDesignerConvert'
import type { Play } from '@/types/play'
import type { DesignerStep } from '@/types/designer'

// Writes a Designer session's play directly into src/data/plays/<id>.ts (and
// registers it in index.ts if it's brand new), the same "only works against
// a local filesystem" pattern the narrative-editor route already uses —
// Vercel's production filesystem is read-only, and a write that somehow
// succeeded there would vanish on the next deploy anyway.
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Publishing is only available in local development' }, { status: 403 })
  }

  const body = await request.json()
  const { id, name, category, set, description, steps } = body as {
    id?: unknown
    name?: unknown
    category?: unknown
    set?: unknown
    description?: unknown
    steps?: unknown
  }

  if (typeof name !== 'string' || !name.trim() || !Array.isArray(steps)) {
    return NextResponse.json({ error: 'Missing name or steps' }, { status: 400 })
  }

  const playId = typeof id === 'string' && id.trim() ? id.trim() : sanitizeSlug(name)
  const varName = toCamelCase(playId)

  const play = buildPlay({
    id: playId,
    name,
    category: category as Play['category'],
    set: set as Play['set'],
    description: typeof description === 'string' ? description : '',
    steps: steps as DesignerStep[],
  })

  const playFilePath = path.join(process.cwd(), 'src', 'data', 'plays', `${playId}.ts`)
  const fileContent = `import type { Play } from '@/types/play'\n\nexport const ${varName}: Play = ${JSON.stringify(play, null, 2)}\n`
  await writeFile(playFilePath, fileContent)

  const indexPath = path.join(process.cwd(), 'src', 'data', 'plays', 'index.ts')
  const project = new Project()
  const indexFile = project.addSourceFileAtPath(indexPath)

  const alreadyRegistered = indexFile
    .getImportDeclarations()
    .some((imp) => imp.getModuleSpecifierValue() === `./${playId}`)

  let isNew = false
  if (!alreadyRegistered) {
    isNew = true
    indexFile.addImportDeclaration({ namedImports: [varName], moduleSpecifier: `./${playId}` })
    const allPlaysArray = indexFile
      .getVariableDeclarationOrThrow('ALL_PLAYS')
      .getInitializerIfKindOrThrow(SyntaxKind.ArrayLiteralExpression)
    allPlaysArray.addElement(varName)
    await indexFile.save()
  }

  return NextResponse.json({ ok: true, id: playId, isNew })
}
