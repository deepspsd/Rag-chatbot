import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const question = body?.question
  const allow_web_fallback = body?.allow_web_fallback
  const source = body?.source

  if (!question || typeof question !== 'string') {
    return NextResponse.json({ error: 'Invalid request: question is required' }, { status: 400 })
  }

  const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000'

  const controller = new AbortController()
  const timeoutMs = Number(process.env.BACKEND_TIMEOUT_MS || 30000)
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  let resp: Response
  try {
    resp = await fetch(`${backendUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        allow_web_fallback: typeof allow_web_fallback === 'boolean' ? allow_web_fallback : true,
        source: typeof source === 'string' ? source : null,
      }),
      cache: 'no-store',
      signal: controller.signal,
    })
  } catch (e: any) {
    const msg = e?.name === 'AbortError' ? 'Backend request timed out' : 'Could not reach backend'
    return NextResponse.json({ error: msg }, { status: 504 })
  } finally {
    clearTimeout(timeout)
  }

  const data = await resp.json().catch(() => null)

  if (!resp.ok) {
    return NextResponse.json(
      { error: data?.detail || data?.error || 'Backend error' },
      { status: resp.status }
    )
  }

  if (data && !data.meta && data.debug) {
    data.meta = data.debug
    delete data.debug
  }

  return NextResponse.json(data)
}
