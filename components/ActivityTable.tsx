import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Activity } from '@/lib/garmin'

function activityBadge(type: string) {
  if (type.includes('running'))
    return <Badge variant="default">🏃 Run</Badge>
  if (type.includes('strength') || type.includes('training') || type.includes('crossfit'))
    return <Badge variant="secondary">💪 Strength</Badge>
  if (type.includes('cycling'))
    return <Badge variant="outline">🚴 Cycle</Badge>
  if (type.includes('swim'))
    return <Badge variant="outline">🏊 Swim</Badge>
  return <Badge variant="outline">⚡ {type.replace(/_/g, ' ')}</Badge>
}

interface ActivityTableProps {
  activities: Activity[]
}

export function ActivityTable({ activities }: ActivityTableProps) {
  const shown = activities.slice(0, 12)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Recent Activities
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {activities.length} total (last 30 days)
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {shown.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No activities found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="text-left pb-2 pr-3 font-medium">Date</th>
                  <th className="text-left pb-2 pr-3 font-medium">Activity</th>
                  <th className="text-left pb-2 pr-3 font-medium">Type</th>
                  <th className="text-right pb-2 pr-3 font-medium">Dist</th>
                  <th className="text-right pb-2 pr-3 font-medium">Pace</th>
                  <th className="text-right pb-2 pr-3 font-medium">Time</th>
                  <th className="text-right pb-2 pr-3 font-medium">Avg HR</th>
                  <th className="text-right pb-2 font-medium">Cal</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((act) => {
                  const isRun = act.type.includes('running')
                  return (
                    <tr
                      key={act.id}
                      className="border-b border-border/40 hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-2.5 pr-3 text-muted-foreground text-xs tabular-nums">
                        {act.date}
                      </td>
                      <td className="py-2.5 pr-3 font-medium max-w-40 truncate">
                        {act.name}
                      </td>
                      <td className="py-2.5 pr-3">{activityBadge(act.type)}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-xs">
                        {act.distanceMi > 0 ? `${act.distanceMi} mi` : '—'}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-xs">
                        {isRun ? (
                          <span className="text-primary font-medium">{act.pace}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-xs">
                        {act.durationMin > 0 ? `${act.durationMin}m` : '—'}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-xs">
                        {act.avgHR ? (
                          <span className="text-red-400">{act.avgHR}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-xs text-muted-foreground">
                        {act.calories?.toLocaleString() ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
