'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const chartConfig: ChartConfig = {
  deepH: { label: 'Deep', color: 'var(--chart-2)' },
  remH: { label: 'REM', color: 'var(--chart-4)' },
  lightH: { label: 'Light', color: 'var(--chart-3)' },
}

interface SleepChartProps {
  trend: { day: string; score: number | null; totalH: number; deepH: number; remH: number }[]
  lastNight: { score: number | null; totalH: number; deepH: number; remH: number }
}

export function SleepChart({ trend, lastNight }: SleepChartProps) {
  const data = trend.map((t) => ({
    day: t.day,
    deepH: t.deepH,
    remH: t.remH,
    lightH: Math.max(0, Math.round((t.totalH - t.deepH - t.remH) * 10) / 10),
  }))

  const hasData = data.some((d) => d.deepH + d.remH + d.lightH > 0)

  const scoreColor =
    !lastNight.score
      ? 'text-foreground'
      : lastNight.score >= 80
        ? 'text-green-400'
        : lastNight.score >= 60
          ? 'text-yellow-400'
          : 'text-red-400'

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Sleep — 7-Day Trend
          </CardTitle>
          <div className="flex items-center gap-3 text-xs">
            <span>
              Score:{' '}
              <strong className={`tabular-nums ${scoreColor}`}>
                {lastNight.score ?? '—'}/100
              </strong>
            </span>
            <span className="text-muted-foreground">
              <strong>{lastNight.totalH}h</strong> total ·{' '}
              <strong className="text-chart-2">{lastNight.deepH}h</strong> deep ·{' '}
              <strong className="text-chart-4">{lastNight.remH}h</strong> REM
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        {hasData ? (
          <ChartContainer config={chartConfig} className="h-40 w-full">
            <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeOpacity={0.15} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
              />
              <YAxis hide domain={[0, 'auto']} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="deepH" fill="var(--color-deepH)" stackId="s" maxBarSize={36} />
              <Bar dataKey="remH" fill="var(--color-remH)" stackId="s" maxBarSize={36} />
              <Bar
                dataKey="lightH"
                fill="var(--color-lightH)"
                stackId="s"
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
            No sleep data available
          </div>
        )}
      </CardContent>
    </Card>
  )
}
