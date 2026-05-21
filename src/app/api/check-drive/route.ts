import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url') ?? ''

  if (!url.includes('drive.google.com')) {
    return NextResponse.json({ ok: false, reason: 'not-drive-url' })
  }

  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })

    const finalUrl = res.url
    if (
      finalUrl.includes('accounts.google.com') ||
      finalUrl.includes('/ServiceLogin') ||
      finalUrl.includes('signin/oauth')
    ) {
      return NextResponse.json({ ok: false, reason: 'login-required' })
    }

    if (!res.ok) {
      return NextResponse.json({ ok: false, reason: `http-${res.status}` })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, reason: 'fetch-error' })
  }
}
