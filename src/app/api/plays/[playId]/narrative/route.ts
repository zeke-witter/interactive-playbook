import { NextResponse } from 'next/server'
import path from 'path'
import { Project, SyntaxKind } from 'ts-morph'
import { sanitizeSlug } from '@/lib/slug'

export async function PATCH(request: Request, { params }: { params: Promise<{ playId: string }> }) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Narrative editing is only available in local development' }, { status: 403 })
  }

  const { playId } = await params
  const body = await request.json()
  const { stepId, position, text } = body as { stepId?: unknown; position?: unknown; text?: unknown }

  if (typeof stepId !== 'string' || typeof position !== 'string' || typeof text !== 'string') {
    return NextResponse.json({ error: 'Missing stepId, position, or text' }, { status: 400 })
  }

  const safePlayId = sanitizeSlug(playId)
  const filePath = path.join(process.cwd(), 'src', 'data', 'plays', `${safePlayId}.ts`)

  const project = new Project()
  let sourceFile
  try {
    sourceFile = project.addSourceFileAtPath(filePath)
  } catch {
    return NextResponse.json({ error: 'Play file not found' }, { status: 404 })
  }

  const stepObject = sourceFile.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression).find((obj) => {
    const idProp = obj.getProperty('id')?.asKind(SyntaxKind.PropertyAssignment)
    const idValue = idProp?.getInitializerIfKind(SyntaxKind.StringLiteral)?.getLiteralValue()
    return idValue === stepId && !!obj.getProperty('narrative')
  })

  if (!stepObject) {
    return NextResponse.json({ error: `Step "${stepId}" not found in ${safePlayId}.ts` }, { status: 404 })
  }

  const narrativeProp = stepObject.getProperty('narrative')?.asKind(SyntaxKind.PropertyAssignment)
  const narrativeObject = narrativeProp?.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression)
  if (!narrativeObject) {
    return NextResponse.json({ error: `Step "${stepId}" has no narrative object` }, { status: 500 })
  }

  const existingProp = narrativeObject.getProperty(position)?.asKind(SyntaxKind.PropertyAssignment)
  if (existingProp) {
    existingProp.setInitializer(JSON.stringify(text))
  } else {
    narrativeObject.addPropertyAssignment({ name: position, initializer: JSON.stringify(text) })
  }

  await sourceFile.save()

  return NextResponse.json({ ok: true })
}
