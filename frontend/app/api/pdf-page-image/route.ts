import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000'
  const url = new URL(req.url)

  const controller = new AbortController()
  const timeoutMs = Number(process.env.BACKEND_TIMEOUT_MS || 30000)
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  const source = url.searchParams.get('source')
  const page = url.searchParams.get('page')

  if (!source || !page) {
    return NextResponse.json({ error: 'source and page are required' }, { status: 400 })
  }

  let resp: Response
  try {
    resp = await fetch(
      `${backendUrl}/pdf_page_image?source=${encodeURIComponent(source)}&page=${encodeURIComponent(page)}`,
      { method: 'GET', signal: controller.signal }
    )
  } catch (e: any) {
    const msg = e?.name === 'AbortError' ? 'Backend request timed out' : 'Could not reach backend'
    return NextResponse.json({ error: msg }, { status: 504 })
  } finally {
    clearTimeout(timeout)
  }

  if (!resp.ok) {
    const data = await resp.json().catch(() => null)
    return NextResponse.json(
      { error: data?.detail || data?.error || 'Backend error' },
      { status: resp.status }
    )
  }

  const buf = await resp.arrayBuffer()
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  })
}
