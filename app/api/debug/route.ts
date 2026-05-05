import { NextResponse } from 'next/server'
import { fetchDashboardData } from '@/lib/garmin'

export async function GET() {
  const data = await fetchDashboardData()
  return NextResponse.json(data)
}
