import { NextRequest, NextResponse } from 'next/server'
import { generateHtmlExport } from '@/actions/export.actions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ zavodId: string }> }
) {
  const { zavodId } = await params

  if (!zavodId) {
    return NextResponse.json(
      { error: 'Missing zavodId parameter' },
      { status: 400 }
    )
  }

  const result = await generateHtmlExport(zavodId)

  if (!result.success || !result.data) {
    return NextResponse.json(
      { error: result.error?.message || 'Failed to generate export' },
      { status: 500 }
    )
  }

  const { html, filename } = result.data

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
