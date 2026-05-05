'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Activity } from '@/lib/garmin'

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface Props {
  activities: Activity[]
}

export function RunLapsDetail({ activities }: Props) {
  const runs = activities
    .filter((a) => a.type.includes('running') && a.laps && a.laps.length > 0)
    .slice(0, 3)

  if (runs.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Last {runs.length} Run{runs.length > 1 ? 's' : ''} — Lap Detail
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {runs.map((run) => (
          <div key={run.id}>
            {/* Run header */}
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-xs font-semibold truncate max-w-[60%]">{run.name}</span>
              <span className="text-[11px] text-muted-foreground">
                {run.date} · {run.distanceMi} mi · {run.durationMin}m
                {run.recoveryTimeHours != null && (
                  <span className="ml-2 text-primary">↻ {run.recoveryTimeHours}h recovery</span>
                )}
              </span>
            </div>
            {(run.aerobicEffect != null || run.anaerobicEffect != null) && (
              <div className="flex gap-2 mb-1.5">
                {run.aerobicEffect != null && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 tabular-nums">
                    Aero {run.aerobicEffect.toFixed(1)}
                  </span>
                )}
                {run.anaerobicEffect != null && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 tabular-nums">
                    Anaero {run.anaerobicEffect.toFixed(1)}
                  </span>
                )}
              </div>
            )}

            {/* Lap table */}
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-2 py-1.5 font-medium text-muted-foreground w-8">Lap</th>
                    <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Dist</th>
                    <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Time</th>
                    <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Pace</th>
                    <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Avg HR</th>
                    <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Max HR</th>
                  </tr>
                </thead>
                <tbody>
                  {run.laps!.map((lap, i) => {
                    const isFirst = i === 0
                    const isLast = i === run.laps!.length - 1
                    const prevHR = i > 0 ? run.laps![i - 1].avgHR : null
                    const hrDelta = lap.avgHR != null && prevHR != null ? lap.avgHR - prevHR : null
                    return (
                      <tr
                        key={lap.index}
                        className={`border-b border-border/50 last:border-0 ${
                          isFirst || isLast ? 'text-muted-foreground' : ''
                        }`}
                      >
                        <td className="px-2 py-1.5 tabular-nums text-muted-foreground">{lap.index}</td>
                        <td className="px-2 py-1.5 tabular-nums text-right">{lap.distanceMi} mi</td>
                        <td className="px-2 py-1.5 tabular-nums text-right">{formatDuration(lap.durationSecs)}</td>
                        <td className="px-2 py-1.5 tabular-nums text-right font-medium text-primary">
                          {lap.pace}/mi
                        </td>
                        <td className="px-2 py-1.5 tabular-nums text-right">
                          {lap.avgHR ?? '—'}
                          {hrDelta != null && Math.abs(hrDelta) >= 5 && (
                            <span className={`ml-1 text-[10px] ${hrDelta > 0 ? 'text-destructive' : 'text-green-500'}`}>
                              {hrDelta > 0 ? `+${hrDelta}` : hrDelta}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums text-right text-muted-foreground">
                          {lap.maxHR ?? '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
