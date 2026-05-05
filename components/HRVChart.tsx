'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const chartConfig: ChartConfig = {
  value: { label: 'HRV (ms)', color: 'var(--chart-1)' },
}

interface HRVChartProps {
  trend: { day: string; value: number | null }[]
  lastNight: number | null
  weeklyAvg: number | null
}

export function HRVChart({ trend, lastNight, weeklyAvg }: HRVChartProps) {
  const data = trend.map((t) => ({ day: t.day, value: t.value ?? 0 }))
  const hasData = data.some((d) => d.value > 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            HRV — 7-Day Trend
          </CardTitle>
          <div className="flex items-center gap-4 text-xs">
            <span>
              Last night:{' '}
              <strong className="text-primary tabular-nums">
                {lastNight ?? '—'} ms
              </strong>
            </span>
            <span className="text-muted-foreground">
              Avg:{' '}
              <strong className="tabular-nums">{weeklyAvg ?? '—'} ms</strong>
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        {hasData ? (
          <ChartContainer config={chartConfig} className="h-36 w-full">
            <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeOpacity={0.15} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
              />
              <YAxis hide domain={['auto', 'auto']} />
              {weeklyAvg && (
                <ReferenceLine
                  y={weeklyAvg}
                  stroke="var(--chart-1)"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
              )}
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Bar
                dataKey="value"
                fill="var(--color-value)"
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="h-36 flex items-center justify-center text-muted-foreground text-sm">
            No HRV data available
          </div>
        )}
      </CardContent>
    </Card>
  )
}
