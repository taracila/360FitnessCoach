import { NextResponse } from 'next/server'
import { loginToGarmin } from '@/lib/garmin'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const username = body.username ?? process.env.GARMIN_USERNAME ?? ''
    const password = body.password ?? process.env.GARMIN_PASSWORD ?? ''

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Missing GARMIN_USERNAME or GARMIN_PASSWORD' },
        { status: 400 }
      )
    }

    await loginToGarmin(username, password)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Login failed' },
      { status: 401 }
    )
  }
}
