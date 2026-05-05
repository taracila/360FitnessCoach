import fs from 'fs'
import path from 'path'
import { format, subDays, startOfWeek } from 'date-fns'
import type { SleepData } from 'garmin-connect/dist/garmin/types/sleep'
import type { IActivity } from 'garmin-connect/dist/garmin/types/activity'

const SESSION_FILE = path.join(process.cwd(), '.garmin-session')
const GC_API = 'https://connectapi.garmin.com'

// Module-level singleton — persists across requests in the same Node.js process
let _client: import('garmin-connect').GarminConnect | null = null

async function getGarminClient() {
  if (_client) return _client

  const { GarminConnect } = await import('garmin-connect')
  const client = new GarminConnect({
    username: process.env.GARMIN_USERNAME ?? '',
    password: process.env.GARMIN_PASSWORD ?? '',
  })

  let sessionRestored = false

  if (fs.existsSync(SESSION_FILE)) {
    try {
      const saved = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'))
      if (saved?.oauth1 && saved?.oauth2) {
        client.loadToken(saved.oauth1, saved.oauth2)
        sessionRestored = true
      }
    } catch {
      // session file corrupt — fresh login
    }
  }

  if (!sessionRestored) {
    await client.login(
      process.env.GARMIN_USERNAME ?? '',
      process.env.GARMIN_PASSWORD ?? ''
    )
    persistSession(client)
  }

  _client = client
  return client
}

function persistSession(client: import('garmin-connect').GarminConnect) {
  try {
    const token = client.exportToken()
    if (token?.oauth1 && token?.oauth2) {
      fs.writeFileSync(SESSION_FILE, JSON.stringify(token, null, 2))
    }
  } catch {
    // non-fatal
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function unwrap<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === 'fulfilled' ? result.value : null
}

function toMiles(meters?: number): number {
  if (!meters) return 0
  return Math.round((meters / 1609.34) * 100) / 100
}

function toHours(seconds?: number): number {
  if (!seconds) return 0
  return Math.round((seconds / 3600) * 10) / 10
}

function formatPace(speedMs?: number): string {
  if (!speedMs || speedMs <= 0) return '—'
  const secsPerMile = 1609.34 / speedMs
  const m = Math.floor(secsPerMile / 60)
  const s = Math.round(secsPerMile % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function parseLaps(data: any): Lap[] {
  if (!data?.lapDTOs) return []
  return (data.lapDTOs as any[])
    .filter((lap) => (lap.distance ?? 0) >= 100) // skip tiny finish laps
    .map((lap) => ({
      index: lap.lapIndex as number,
      distanceMi: toMiles(lap.distance),
      pace: formatPace(lap.averageSpeed),
      avgHR: (lap.averageHR as number) || null,
      maxHR: (lap.maxHR as number) || null,
      durationSecs: Math.round(lap.duration as number),
    }))
}

function parseSleep(sd: SleepData | null) {
  if (!sd) return { score: null, totalH: 0, deepH: 0, remH: 0, lightH: 0 }
  const dto = sd.dailySleepDTO
  return {
    score: sd.dailySleepDTO?.sleepScores?.overall?.value ?? null,
    totalH: toHours(dto?.sleepTimeSeconds),
    deepH: toHours(dto?.deepSleepSeconds),
    remH: toHours(dto?.remSleepSeconds),
    lightH: toHours(dto?.lightSleepSeconds),
  }
}

// ─── Public types ──────────────────────────────────────────────────────────────

export type Lap = {
  index: number
  distanceMi: number
  pace: string
  avgHR: number | null
  maxHR: number | null
  durationSecs: number
}

export type Activity = {
  id: number
  name: string
  date: string
  type: string
  distanceMi: number
  pace: string
  durationMin: number
  avgHR: number | null
  maxHR: number | null
  calories: number | null
  aerobicEffect: number | null
  anaerobicEffect: number | null
  recoveryTimeHours: number | null
  laps?: Lap[]
}

export type WeeklySummary = {
  weekOf: string
  totalMi: number
  runs: number
}

export type Fitness = {
  weightLbs: number | null
  vo2Max: number | null
  lactateHR: number | null
  lactateThresholdPace: string | null
}

export type DashboardData = {
  hrv: {
    lastNight: number | null
    weeklyAvg: number | null
    trend: { day: string; value: number | null }[]
  }
  sleep: {
    lastNight: { score: number | null; totalH: number; deepH: number; remH: number }
    trend: { day: string; score: number | null; totalH: number; deepH: number; remH: number }[]
  }
  bodyBattery: { current: number | null; charged: number | null; drained: number | null }
  vitals: { restingHR: number | null; steps: number | null; stress: number | null }
  fitness: Fitness
  activities: Activity[]
  weeklyMileage: WeeklySummary[]
}

// ─── Main fetch ────────────────────────────────────────────────────────────────

export async function fetchDashboardData(): Promise<DashboardData> {
  const client = await getGarminClient()

  const today = new Date()
  const last7Dates = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i))
  const last7Strs = last7Dates.map((d) => format(d, 'yyyy-MM-dd'))

  // ── Profile — needed for display-name-scoped endpoints ──────────────────
  const profileR = await Promise.allSettled([client.getUserProfile()])
  const displayName: string =
    ((profileR[0] as PromiseFulfilledResult<any>)?.value?.displayName as string) ?? ''

  const [
    sleepTodayR,
    stepsR,
    activitiesR,
    bbR,
    stressR,
    settingsR,
    weightR,
    trainingStatusR,
    ...sleepTrendResults
  ] = await Promise.allSettled([
    client.getSleepData(today),
    client.getSteps(today),
    client.getActivities(0, 30),
    // Daily user summary — body battery + stress fallback
    displayName
      ? client.get<any>(
          `${GC_API}/usersummary-service/usersummary/daily/${displayName}?calendarDate=${last7Strs[6]}`
        )
      : Promise.resolve(null),
    // Daily stress
    client.get<any>(
      `${GC_API}/wellness-service/wellness/dailyStress/${last7Strs[6]}`
    ),
    // User settings — vo2MaxRunning, lactateThresholdHeartRate, lactateThresholdSpeed
    client.getUserSettings(),
    // Weight
    client.getDailyWeightData(today),
    // Training status: fitnessstats-service requires web session auth — always resolves null
    Promise.resolve(null),
    // 7-day sleep (for HRV + sleep trend)
    ...last7Dates.map((d) => client.getSleepData(d)),
  ])

  // ── Sleep today ────────────────────────────────────────────────────────────
  const sleepToday = unwrap(sleepTodayR) as SleepData | null
  const sleepParsed = parseSleep(sleepToday)

  // ── HRV (from overnight sleep data) ───────────────────────────────────────
  const sleepTrend = sleepTrendResults.map((r, i) => {
    const sd = unwrap(r) as SleepData | null
    const parsed = parseSleep(sd)
    return {
      day: format(last7Dates[i], 'EEE'),
      score: parsed.score,
      totalH: parsed.totalH,
      deepH: parsed.deepH,
      remH: parsed.remH,
      hrv: sd?.avgOvernightHrv ?? null,
    }
  })

  const hrvTrend = sleepTrend.map(({ day, hrv }) => ({ day, value: hrv }))
  const lastNightHrv = sleepToday?.avgOvernightHrv ?? null
  const validHrv = hrvTrend.map((x) => x.value).filter((v): v is number => v !== null)
  const weeklyAvgHrv =
    validHrv.length > 0
      ? Math.round(validHrv.reduce((a, b) => a + b, 0) / validHrv.length)
      : null

  // ── Body battery (from usersummary daily) ─────────────────────────────────
  const summary = unwrap(bbR) as any
  const currentBB: number | null =
    summary?.bodyBatteryMostRecentValue ?? summary?.currentBodyBatteryLevel ?? null
  const bbCharged: number | null = summary?.bodyBatteryChargedValue ?? null
  const bbDrained: number | null = summary?.bodyBatteryDrainedValue ?? null

  // ── Stress (user summary is primary; wellness daily stress as fallback) ────
  const stressData = unwrap(stressR) as any
  const avgStress: number | null =
    summary?.averageStressLevel ?? stressData?.averageStressLevel ?? null

  // ── Steps + resting HR (user summary is more reliable than sleep-derived) ──
  const steps = unwrap(stepsR) as number | null
  const restingHR = summary?.restingHeartRate ?? sleepToday?.restingHeartRate ?? null

  // ── Fitness metrics ────────────────────────────────────────────────────────
  const settings = unwrap(settingsR) as any
  const weightData = unwrap(weightR) as any
  const tsData = unwrap(trainingStatusR) as any
  const userData = settings?.userData as any

  // Weight: prefer settings.userData.weight (grams), fall back to daily weight log
  const weightGrams: number | null = userData?.weight ?? weightData?.totalAverage?.weight ?? null
  const weightLbs = weightGrams != null ? Math.round((weightGrams / 453.592) * 10) / 10 : null

  // VO2 max and lactate threshold from user settings (nested under .userData)
  const vo2Max = (userData?.vo2MaxRunning as number) ?? null
  const lactateHR = (userData?.lactateThresholdHeartRate as number) ?? null
  // lactateThresholdSpeed from userData is in dm/s (0.1 m/s units) — multiply by 10 to get m/s
  const lactateSpeedMs = (userData?.lactateThresholdSpeed as number) ?? null
  const lactateThresholdPace = lactateSpeedMs ? formatPace(lactateSpeedMs * 10) : null

  // ── Activities ─────────────────────────────────────────────────────────────
  const activitiesRaw = (unwrap(activitiesR) as IActivity[]) ?? []

  // ── Splits for last 3 runs ─────────────────────────────────────────────────
  const last3RunIds = activitiesRaw
    .filter((a) => a.activityType?.typeKey?.includes('running'))
    .slice(0, 3)
    .map((a) => a.activityId)

  const splitResults = await Promise.allSettled(
    last3RunIds.map((id) =>
      client.get<any>(`${GC_API}/activity-service/activity/${id}/splits`)
    )
  )

  const lapsMap = new Map<number, Lap[]>()
  splitResults.forEach((r, i) => {
    if (r.status === 'fulfilled' && last3RunIds[i] != null) {
      lapsMap.set(last3RunIds[i], parseLaps(r.value))
    }
  })

  const activities: Activity[] = activitiesRaw.slice(0, 30).map((act) => ({
    id: act.activityId,
    name: act.activityName ?? 'Unknown',
    date: act.startTimeLocal ? format(new Date(act.startTimeLocal), 'MMM d') : '—',
    type: act.activityType?.typeKey ?? 'other',
    distanceMi: toMiles(act.distance),
    pace: formatPace(act.averageSpeed),
    durationMin: Math.round((act.duration ?? 0) / 60),
    avgHR: act.averageHR || null,
    maxHR: act.maxHR || null,
    calories: act.calories || null,
    aerobicEffect: (act.aerobicTrainingEffect as number) ?? null,
    anaerobicEffect: (act as any).anaerobicTrainingEffect ?? null,
    recoveryTimeHours: (act as any).recoveryTime ?? null,
    laps: lapsMap.get(act.activityId),
  }))

  // ── Weekly mileage ─────────────────────────────────────────────────────────
  const weeksMap: Record<string, { totalMi: number; runs: number }> = {}
  for (const act of activitiesRaw) {
    if (!act.startTimeLocal) continue
    try {
      const d = new Date(act.startTimeLocal)
      const wk = format(startOfWeek(d, { weekStartsOn: 1 }), 'MMM d')
      if (!weeksMap[wk]) weeksMap[wk] = { totalMi: 0, runs: 0 }
      const isRun = act.activityType?.typeKey?.includes('running') ?? false
      if (isRun) {
        weeksMap[wk].totalMi += (act.distance ?? 0) / 1609.34
        weeksMap[wk].runs++
      }
    } catch {}
  }
  const weeklyMileage: WeeklySummary[] = Object.entries(weeksMap)
    .map(([weekOf, d]) => ({
      weekOf,
      totalMi: Math.round(d.totalMi * 10) / 10,
      runs: d.runs,
    }))
    .slice(-6)

  return {
    hrv: {
      lastNight: lastNightHrv,
      weeklyAvg: weeklyAvgHrv,
      trend: hrvTrend,
    },
    sleep: {
      lastNight: {
        score: sleepParsed.score,
        totalH: sleepParsed.totalH,
        deepH: sleepParsed.deepH,
        remH: sleepParsed.remH,
      },
      trend: sleepTrend.map(({ day, score, totalH, deepH, remH }) => ({
        day,
        score,
        totalH,
        deepH,
        remH,
      })),
    },
    bodyBattery: {
      current: typeof currentBB === 'number' ? currentBB : null,
      charged: bbCharged,
      drained: bbDrained,
    },
    vitals: {
      restingHR,
      steps: typeof steps === 'number' ? steps : null,
      stress: avgStress,
    },
    fitness: {
      weightLbs,
      vo2Max: typeof vo2Max === 'number' ? vo2Max : null,
      lactateHR: typeof lactateHR === 'number' ? lactateHR : null,
      lactateThresholdPace,
    },
    activities,
    weeklyMileage,
  }
}

export async function loginToGarmin(username: string, password: string): Promise<void> {
  const { GarminConnect } = await import('garmin-connect')
  const client = new GarminConnect({ username, password })
  await client.login(username, password)
  _client = client
  persistSession(client)
}
