import { NextResponse } from 'next/server'

export async function GET() {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const url = `https://www.crossfit.com/workout/${yyyy}/${mm}/${dd}`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; garmin-coach/1.0)' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error(`CrossFit.com returned HTTP ${res.status}`)

    const html = await res.text()

    const startIdx = html.indexOf('_workout-of-the-day-content')
    if (startIdx === -1) throw new Error('Workout section not found on page')

    let text = html
      .slice(startIdx, startIdx + 12000)
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#x27;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim()

    // Strip everything before "Workout of the Day"
    const wodStart = text.indexOf('Workout of the Day')
    if (wodStart !== -1) text = text.slice(wodStart + 'Workout of the Day'.length).trim()

    // Cut off at noise sections
    for (const cutoff of ['Resources:', 'Find a gym', 'Comments on', 'Learn the Movement →']) {
      const idx = text.indexOf(cutoff)
      if (idx !== -1) {
        text = text.slice(0, idx).trim()
        break
      }
    }

    return NextResponse.json({ wod: text, date: `${yyyy}-${mm}-${dd}`, url })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
