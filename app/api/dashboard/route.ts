import { NextResponse } from 'next/server'
import { fetchDashboardData } from '@/lib/garmin'

export async function GET() {
  try {
    const data = await fetchDashboardData()
    return NextResponse.json(data)
  } catch (err: any) {
    const message = err?.message ?? 'Failed to fetch Garmin data'
    const isAuth = message.toLowerCase().includes('login') || message.includes('401')
    return NextResponse.json(
      { error: message, needsLogin: isAuth },
      { status: isAuth ? 401 : 500 }
    )
  }
}
