import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000'

  const controller = new AbortController()
  const timeoutMs = Number(process.env.BACKEND_TIMEOUT_MS || 60000)
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  const formData = await req.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }

  const out = new FormData()
  out.append('file', file, file.name)

  let resp: Response
  try {
    resp = await fetch(`${backendUrl}/upload_pdf`, {
      method: 'POST',
      body: out,
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

  return NextResponse.json(data)
}
