import { NextResponse } from 'next/server'
import type { DashboardData } from '@/lib/garmin'

const ATHLETE = {
  name: 'Eugen',
  age: 43,
  location: 'San Jose, CA',
  marathonPR: '3:23',
  schedule: '6 runs/week + CrossFit',
  easyPace: '8:30/mi',
  nextRace: 'Budapest Marathon — October 11, 2026',
}

export async function POST(request: Request) {
  const {
    runnaplan,
    wod,
    targetTime,
    runTime,
    crossfitTime,
    weather,
    data,
  }: {
    runnaplan: string
    wod: string
    targetTime: string
    runTime: string
    crossfitTime: string
    weather: {
      local: { temp: number; feelsLike: number; humidity: number; windMph: number; precipitation: number; uvIndex: number; description: string }
      budapest: { tempMaxF: number; tempMinF: number; feelsLikeMaxF: number; feelsLikeMinF: number; windMph: number; precipitation: number; description: string } | null
      daysToRace: number
    } | null
    data: DashboardData
  } = await request.json()

  const now = new Date()
  const today = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const currentTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Los_Angeles',
  })

  const raceDate = new Date('2026-10-11')
  const daysToRace = Math.ceil((raceDate.getTime() - Date.now()) / 86400000)

  const recentRuns = data.activities
    .filter((a) => a.type.includes('running'))
    .slice(0, 5)
    .map((a) => {
      const header = `  • ${a.date}: ${a.name} — ${a.distanceMi > 0 ? `${a.distanceMi} mi` : '—'} | avg ${a.pace}/mi | HR ${a.avgHR ?? '—'} bpm | ${a.durationMin}m${a.recoveryTimeHours != null ? ` | recovery ${a.recoveryTimeHours}h` : ''}`
      if (a.laps && a.laps.length > 0) {
        const lapLines = a.laps
          .map((l) => `      Lap ${l.index}: ${l.distanceMi}mi ${l.pace}/mi HR${l.avgHR ?? '—'}`)
          .join('\n')
        return `${header}\n${lapLines}`
      }
      return header
    })
    .join('\n')

  const weeklyMi = data.weeklyMileage
    .map((w) => `  Week of ${w.weekOf}: ${w.totalMi} mi (${w.runs} runs)`)
    .join('\n')

  const f = data.fitness
  const ltLine = [f.lactateHR ? `${f.lactateHR} bpm` : null, f.lactateThresholdPace ? `${f.lactateThresholdPace}/mi` : null]
    .filter(Boolean)
    .join(' @ ') || '—'

  const prompt = `GARMIN TRAINING REPORT — ${ATHLETE.name}
${'═'.repeat(52)}
Date: ${today}
Time: ${currentTime} (Pacific)

ATHLETE PROFILE
  Name:        ${ATHLETE.name} | Age: ${ATHLETE.age} | ${ATHLETE.location}
  Marathon PR: ${ATHLETE.marathonPR}     Easy pace: ${ATHLETE.easyPace}
  Schedule:    ${ATHLETE.schedule}
  Next race:   ${ATHLETE.nextRace} (${daysToRace} days away)
  Target time: ${targetTime?.trim() || '(not set)'}
  Today's run: ${runTime || '(not scheduled)'}
  CrossFit:    ${crossfitTime || '(not scheduled)'}

FITNESS PROFILE
  VO2 Max:             ${f.vo2Max != null ? `${f.vo2Max} ml/kg/min` : '—'}
  Lactate Threshold:   ${ltLine}
  Weight:              ${f.weightLbs != null ? `${f.weightLbs} lbs` : '—'}

TODAY'S CONDITIONS — San Jose, CA 95123
${weather
  ? `  ${weather.local.description} · ${weather.local.temp}°F (feels like ${weather.local.feelsLike}°F) · Humidity ${weather.local.humidity}% · Wind ${weather.local.windMph} mph · UV index ${weather.local.uvIndex}${weather.local.precipitation > 0 ? ` · Precip ${weather.local.precipitation}"` : ''}`
  : '  (weather unavailable)'}${weather?.budapest ? `

BUDAPEST RACE-DAY FORECAST — October 11, 2026
  ${weather.budapest.description} · ${weather.budapest.tempMinF}–${weather.budapest.tempMaxF}°F (feels like ${weather.budapest.feelsLikeMinF}–${weather.budapest.feelsLikeMaxF}°F) · Wind ${weather.budapest.windMph} mph${weather.budapest.precipitation > 0 ? ` · Precip ${weather.budapest.precipitation}"` : ''}` : ''}

RECOVERY STATUS
  HRV:          ${data.hrv.lastNight ?? '—'} ms last night | 7-day avg: ${data.hrv.weeklyAvg ?? '—'} ms
  Sleep:        ${data.sleep.lastNight.score ?? '—'}/100 | ${data.sleep.lastNight.totalH}h total | ${data.sleep.lastNight.deepH}h deep | ${data.sleep.lastNight.remH}h REM
  Body Battery: ${data.bodyBattery.current ?? '—'}% current | +${data.bodyBattery.charged ?? '—'} charged | −${data.bodyBattery.drained ?? '—'} drained
  Resting HR:   ${data.vitals.restingHR ?? '—'} bpm
  Steps:        ${data.vitals.steps?.toLocaleString() ?? '—'}
  Stress:       ${data.vitals.stress ?? '—'}/100

RECENT RUNS (last 5)
${recentRuns || '  No recent runs found'}

WEEKLY MILEAGE (last 6 weeks)
${weeklyMi || '  No data'}

RUNNA WEEKLY PLAN
${runnaplan?.trim() ? runnaplan.trim() : '  (not provided)'}

TODAY'S WOD
${wod?.trim() ? wod.trim() : '  (not provided)'}

${'═'.repeat(52)}
Please analyze my training readiness and provide:
1. Recovery assessment — is today a go, modify, or rest day?
2. Any concerning trends in HRV, sleep, or body battery.
3. Pace/intensity adjustments for today's planned workout, referencing my lactate threshold and VO2 max where relevant.
4. Whether my recent training load is appropriate given ${daysToRace} days to Budapest Marathon${targetTime?.trim() ? ` and my target of ${targetTime.trim()}` : ''}.
5. Anything in the weekly plan to reconsider given my recovery.
6. One specific coaching cue for this training week.`

  return NextResponse.json({ prompt })
}
