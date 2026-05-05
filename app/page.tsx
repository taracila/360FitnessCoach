'use client'

import { useState, useEffect, useCallback } from 'react'
import { MetricCard } from '@/components/MetricCard'
import { HRVChart } from '@/components/HRVChart'
import { SleepChart } from '@/components/SleepChart'
import { ActivityTable } from '@/components/ActivityTable'
import { RunLapsDetail } from '@/components/RunLapsDetail'
import { ReportPanel } from '@/components/ReportPanel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardData } from '@/lib/garmin'

type LocalWeather = {
  temp: number
  feelsLike: number
  humidity: number
  windMph: number
  precipitation: number
  uvIndex: number
  description: string
}

type BudapestWeather = {
  tempMaxF: number
  tempMinF: number
  feelsLikeMaxF: number
  feelsLikeMinF: number
  windMph: number
  precipitation: number
  description: string
}

type WeatherData = {
  local: LocalWeather
  budapest: BudapestWeather | null
  daysToRace: number
}

type Status = 'good' | 'warn' | 'bad' | 'neutral'

function hrvStatus(v: number | null | undefined): Status {
  if (!v) return 'neutral'
  return v >= 55 ? 'good' : v >= 40 ? 'warn' : 'bad'
}
function sleepStatus(v: number | null | undefined): Status {
  if (!v) return 'neutral'
  return v >= 80 ? 'good' : v >= 60 ? 'warn' : 'bad'
}
function bbStatus(v: number | null | undefined): Status {
  if (!v) return 'neutral'
  return v >= 60 ? 'good' : v >= 30 ? 'warn' : 'bad'
}
function stressStatus(v: number | null | undefined): Status {
  if (v === null || v === undefined) return 'neutral'
  return v <= 25 ? 'good' : v <= 50 ? 'warn' : 'bad'
}

function stepsStatus(v: number | null | undefined): Status {
  if (!v) return 'neutral'
  return v >= 10000 ? 'good' : v >= 7000 ? 'warn' : 'neutral'
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [weather, setWeather] = useState<WeatherData | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? `HTTP ${res.status}`)
      }
      const json = await res.json()
      setData(json)
      setLastRefresh(new Date())
    } catch (e: any) {
      setError(e.message ?? 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetch('/api/weather')
      .then((r) => r.json())
      .then((j) => { if (!j.error) setWeather(j) })
      .catch(() => {})
  }, [])

  const d = data

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Main dashboard panel ───────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Sticky header */}
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground font-black text-sm tracking-tight">GC</span>
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight">GARMIN COACH</div>
              <div className="text-[11px] text-muted-foreground leading-none mt-0.5">
                Eugen, 43 · San Jose, CA · PR 3:23
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-[11px] text-muted-foreground border border-border rounded px-2 py-1 hidden sm:block">
              Budapest · {Math.ceil((new Date('2026-10-11').getTime() - Date.now()) / 86400000)}d
            </div>
            {weather && (
              <div className="text-[11px] text-muted-foreground border border-border rounded px-2 py-1 hidden sm:flex items-center gap-1.5">
                <span>{weather.local.temp}°F</span>
                <span className="opacity-40">·</span>
                <span>{weather.local.description}</span>
                <span className="opacity-40">·</span>
                <span>Feels {weather.local.feelsLike}°F</span>
                <span className="opacity-40">·</span>
                <span>{weather.local.windMph} mph</span>
              </div>
            )}
            {weather?.budapest && (
              <div className="text-[11px] text-primary border border-primary/40 rounded px-2 py-1 hidden sm:flex items-center gap-1.5">
                <span>BUD race day:</span>
                <span>{weather.budapest.tempMinF}–{weather.budapest.tempMaxF}°F</span>
                <span className="opacity-40">·</span>
                <span>{weather.budapest.description}</span>
                <span className="opacity-40">·</span>
                <span>{weather.budapest.windMph} mph</span>
              </div>
            )}
            {loading && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="animate-pulse">●</span>
                <span>Syncing Garmin…</span>
              </div>
            )}
            {lastRefresh && !loading && (
              <span className="text-[11px] text-muted-foreground">
                {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="text-xs h-8"
            >
              {loading ? '…' : '↻ Refresh'}
            </Button>
          </div>
        </header>

        <div className="p-6 space-y-5">
          {/* Error state */}
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-start gap-2">
              <span className="mt-0.5 shrink-0">⚠</span>
              <div>
                <strong>Could not load Garmin data:</strong> {error}
                <br />
                <span className="text-xs opacity-80">
                  Make sure GARMIN_USERNAME and GARMIN_PASSWORD are set in .env.local
                </span>
              </div>
            </div>
          )}

          {/* ── Metric cards ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            <MetricCard
              label="HRV"
              value={d?.hrv.lastNight}
              unit="ms"
              sub={`7-day avg: ${d?.hrv.weeklyAvg ?? '—'} ms`}
              icon="💓"
              status={hrvStatus(d?.hrv.lastNight)}
            />
            <MetricCard
              label="Sleep Score"
              value={d?.sleep.lastNight.score}
              unit="/100"
              sub={`${d?.sleep.lastNight.totalH ?? '—'}h · ${d?.sleep.lastNight.deepH ?? '—'}h deep · ${d?.sleep.lastNight.remH ?? '—'}h REM`}
              icon="🌙"
              status={sleepStatus(d?.sleep.lastNight.score)}
            />
            <MetricCard
              label="Body Battery"
              value={d?.bodyBattery.current}
              unit="%"
              sub={`+${d?.bodyBattery.charged ?? '—'} charged · −${d?.bodyBattery.drained ?? '—'} drained`}
              icon="⚡"
              status={bbStatus(d?.bodyBattery.current)}
            />
            <MetricCard
              label="Resting HR"
              value={d?.vitals.restingHR}
              unit="bpm"
              icon="❤️"
              status="neutral"
            />
            <MetricCard
              label="Steps"
              value={d?.vitals.steps != null ? d.vitals.steps.toLocaleString() : null}
              icon="👟"
              status={stepsStatus(d?.vitals.steps)}
            />
            <MetricCard
              label="Stress"
              value={d?.vitals.stress}
              unit="/100"
              icon="🧠"
              status={stressStatus(d?.vitals.stress)}
            />
          </div>

          {/* ── Fitness profile ──────────────────────────────────────────── */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Fitness Profile
            </p>
            <div className="grid grid-cols-3 gap-3">
              <MetricCard
                label="VO₂ Max"
                value={d?.fitness.vo2Max}
                unit="ml/kg/min"
                icon="🫁"
                status="neutral"
              />
              <MetricCard
                label="Lactate Threshold"
                value={d?.fitness.lactateHR}
                unit="bpm"
                sub={d?.fitness.lactateThresholdPace ? `${d.fitness.lactateThresholdPace}/mi pace` : undefined}
                icon="🔬"
                status="neutral"
              />
              <MetricCard
                label="Weight"
                value={d?.fitness.weightLbs}
                unit="lbs"
                icon="⚖️"
                status="neutral"
              />
            </div>
          </div>

          {/* ── Charts ───────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <HRVChart
              trend={d?.hrv.trend ?? []}
              lastNight={d?.hrv.lastNight ?? null}
              weeklyAvg={d?.hrv.weeklyAvg ?? null}
            />
            <SleepChart
              trend={d?.sleep.trend ?? []}
              lastNight={d?.sleep.lastNight ?? { score: null, totalH: 0, deepH: 0, remH: 0 }}
            />
          </div>

          {/* ── Run lap detail ───────────────────────────────────────────── */}
          <RunLapsDetail activities={d?.activities ?? []} />

          {/* ── Weekly mileage ────────────────────────────────────────────── */}
          {d?.weeklyMileage && d.weeklyMileage.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Weekly Mileage — Last 6 Weeks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {d.weeklyMileage.map((w, i) => {
                    const isLast = i === d.weeklyMileage.length - 1
                    const maxMi = Math.max(...d.weeklyMileage.map((x) => x.totalMi), 1)
                    const barH = Math.max(4, Math.round((w.totalMi / maxMi) * 48))
                    return (
                      <div key={w.weekOf} className="flex-1 flex flex-col items-center gap-1">
                        <div className="text-sm font-bold tabular-nums text-primary">
                          {w.totalMi}
                        </div>
                        <div className="text-[10px] text-muted-foreground">mi</div>
                        <div className="w-full flex items-end justify-center h-12">
                          <div
                            className={`w-6 rounded-t-sm ${isLast ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                            style={{ height: `${barH}px` }}
                          />
                        </div>
                        <div className="text-[10px] text-muted-foreground text-center leading-tight">
                          {w.weekOf}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {w.runs}🏃
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Activities table ──────────────────────────────────────────── */}
          <ActivityTable activities={d?.activities ?? []} />
        </div>
      </main>

      {/* ── Right sidebar ─────────────────────────────────────────────────── */}
      <aside className="w-88 shrink-0 border-l border-border overflow-y-auto p-4 bg-card/30">
        <div className="mb-3 pb-3 border-b border-border">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Weekly Plan & Report
          </h2>
        </div>
        <ReportPanel data={data} weather={weather} />
      </aside>
    </div>
  )
}
