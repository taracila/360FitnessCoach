'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { DashboardData } from '@/lib/garmin'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

interface Props {
  data: DashboardData | null
}

export function AskGemini({ data }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function submit() {
    const prompt = input.trim()
    if (!prompt || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: prompt }])
    setLoading(true)

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, data }),
      })
      const json = await res.json()
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: json.answer ?? json.error ?? 'No response.' },
      ])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Request failed.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Ask Gemini
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-0">
        {/* Message history */}
        {messages.length > 0 && (
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-[12px] leading-relaxed rounded-md px-2.5 py-2 ${
                  m.role === 'user'
                    ? 'bg-primary/10 text-foreground self-end max-w-[85%]'
                    : 'bg-muted/50 text-foreground self-start max-w-[95%]'
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="text-[12px] text-muted-foreground animate-pulse px-2.5 py-2">
                Thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Input row */}
        <div className="flex gap-2">
          <input
            className="flex-1 bg-muted/40 border border-border rounded-md px-3 py-1.5 text-[12px] outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
            placeholder={data ? 'Ask anything about your data…' : 'Loading data…'}
            value={input}
            disabled={!data || loading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <Button
            size="sm"
            className="h-8 text-xs px-3"
            disabled={!data || loading || !input.trim()}
            onClick={submit}
          >
            Ask
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
