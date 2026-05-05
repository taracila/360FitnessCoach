'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { DashboardData } from '@/lib/garmin'

type WeatherData = {
  local: {
    temp: number
    feelsLike: number
    humidity: number
    windMph: number
    precipitation: number
    uvIndex: number
    description: string
  }
  budapest: {
    tempMaxF: number
    tempMinF: number
    feelsLikeMaxF: number
    feelsLikeMinF: number
    windMph: number
    precipitation: number
    description: string
  } | null
  daysToRace: number
}

interface ReportPanelProps {
  data: DashboardData | null
  weather: WeatherData | null
}

export function ReportPanel({ data, weather }: ReportPanelProps) {
  const [runnaplan, setRunnaplan] = useState('')
  const [targetTime, setTargetTime] = useState('')
  const [runTime, setRunTime] = useState('')
  const [crossfitTime, setCrossfitTime] = useState('')
  const [wod, setWod] = useState('')
  const [wodLoading, setWodLoading] = useState(true)
  const [wodError, setWodError] = useState<string | null>(null)
  const [report, setReport] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Restore persisted fields from localStorage
  useEffect(() => {
    const plan = localStorage.getItem('garmin-coach-runnaplan')
    if (plan) setRunnaplan(plan)
    const target = localStorage.getItem('garmin-coach-targettime')
    if (target) setTargetTime(target)
    const rt = localStorage.getItem('garmin-coach-runtime')
    if (rt) setRunTime(rt)
    const ct = localStorage.getItem('garmin-coach-crossfittime')
    if (ct) setCrossfitTime(ct)
  }, [])

  // Auto-fetch today's CrossFit WOD
  useEffect(() => {
    fetch('/api/wod')
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error)
        setWod(json.wod ?? '')
      })
      .catch((e) => setWodError(e.message))
      .finally(() => setWodLoading(false))
  }, [])

  const saveRunna = (val: string) => {
    setRunnaplan(val)
    localStorage.setItem('garmin-coach-runnaplan', val)
  }

  const saveTargetTime = (val: string) => {
    setTargetTime(val)
    localStorage.setItem('garmin-coach-targettime', val)
  }

  const saveRunTime = (val: string) => {
    setRunTime(val)
    localStorage.setItem('garmin-coach-runtime', val)
  }

  const saveCrossfitTime = (val: string) => {
    setCrossfitTime(val)
    localStorage.setItem('garmin-coach-crossfittime', val)
  }

  const generate = async () => {
    if (!data) return
    setLoading(true)
    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runnaplan, wod, targetTime, runTime, crossfitTime, weather, data }),
      })
      const json = await res.json()
      setReport(json.prompt ?? '')
    } catch (err: any) {
      setReport(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(report)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Race target */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Budapest Marathon · Oct 11, 2026
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="text"
            value={targetTime}
            onChange={(e) => saveTargetTime(e.target.value)}
            placeholder="Target time e.g. 3:10:00"
            className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <p className="text-[10px] text-muted-foreground mt-1.5">Auto-saved · used in report</p>
        </CardContent>
      </Card>

      {/* Training schedule */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Today's Training Times
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">Run</label>
              <input
                type="time"
                value={runTime}
                onChange={(e) => saveRunTime(e.target.value)}
                className="w-full bg-background border border-input rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">CrossFit</label>
              <input
                type="time"
                value={crossfitTime}
                onChange={(e) => saveCrossfitTime(e.target.value)}
                className="w-full bg-background border border-input rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">Auto-saved · used in report</p>
        </CardContent>
      </Card>

      {/* Runna Plan */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Weekly Runna Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={runnaplan}
            onChange={(e) => saveRunna(e.target.value)}
            placeholder={`Mon: Easy 6mi @ 8:30/mi\nTue: CrossFit + strides\nWed: Tempo 8mi\n...`}
            className="min-h-44 text-xs leading-relaxed"
          />
          <p className="text-[10px] text-muted-foreground mt-1.5">Auto-saved to browser</p>
        </CardContent>
      </Card>

      {/* WOD */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Today's WOD
            </CardTitle>
            {wodLoading && (
              <span className="text-[10px] text-muted-foreground animate-pulse">Fetching…</span>
            )}
            {!wodLoading && !wodError && (
              <span className="text-[10px] text-muted-foreground">crossfit.com</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {wodError && (
            <p className="text-[10px] text-destructive mb-1.5">{wodError}</p>
          )}
          <Textarea
            value={wod}
            onChange={(e) => setWod(e.target.value)}
            placeholder={wodLoading ? 'Loading WOD…' : 'e.g. "21-15-9 Thrusters + Pull-ups"'}
            className="min-h-28 text-xs leading-relaxed"
          />
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Auto-fetched from CrossFit.com · editable
          </p>
        </CardContent>
      </Card>

      {/* Generate button */}
      <Button
        onClick={generate}
        disabled={loading || !data}
        size="lg"
        className="w-full font-bold tracking-wide"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin">⟳</span> Generating…
          </span>
        ) : (
          '⚡ Generate Claude Report'
        )}
      </Button>

      {!data && (
        <p className="text-xs text-center text-muted-foreground">
          Waiting for Garmin data…
        </p>
      )}

      {/* Generated report */}
      {report && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Generated Prompt
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={copy}
                className="h-7 text-xs px-2"
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-80 overflow-y-auto bg-muted/30 rounded-md p-3">
              {report}
            </pre>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              Paste into Claude.ai to get your coaching analysis
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
