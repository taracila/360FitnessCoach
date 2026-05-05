import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

type Status = 'good' | 'warn' | 'bad' | 'neutral'

interface MetricCardProps {
  label: string
  value: string | number | null | undefined
  unit?: string
  sub?: string
  icon: React.ReactNode
  status?: Status
}

const statusColors: Record<Status, string> = {
  good: 'text-green-400',
  warn: 'text-yellow-400',
  bad: 'text-red-400',
  neutral: 'text-foreground',
}

const statusDots: Record<Status, string> = {
  good: 'bg-green-400',
  warn: 'bg-yellow-400',
  bad: 'bg-red-400',
  neutral: 'bg-muted-foreground',
}

export function MetricCard({ label, value, unit, sub, icon, status = 'neutral' }: MetricCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div
        className={cn(
          'absolute top-0 left-0 w-full h-0.5',
          status === 'good' && 'bg-green-400',
          status === 'warn' && 'bg-yellow-400',
          status === 'bad' && 'bg-red-400',
          status === 'neutral' && 'bg-border'
        )}
      />
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-base leading-none">{icon}</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest">
              {label}
            </span>
          </div>
          <div
            className={cn('w-1.5 h-1.5 rounded-full', statusDots[status])}
          />
        </div>
        <div className={cn('text-2xl font-bold tabular-nums leading-none', statusColors[status])}>
          {value ?? '—'}
          {unit && (
            <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>
          )}
        </div>
        {sub && (
          <div className="text-[11px] text-muted-foreground mt-1.5 truncate">{sub}</div>
        )}
      </CardContent>
    </Card>
  )
}
