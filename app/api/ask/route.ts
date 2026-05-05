import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const SYSTEM = `You are a personal running coach assistant with access to the athlete's live Garmin dashboard data.
Answer questions concisely and specifically using the data provided. Focus on actionable insights.
The athlete is Eugen, 43, training for the Budapest Marathon on October 11 2026. PR is 3:23.
Use imperial units (miles, lbs, °F). Keep responses short — 2-4 sentences unless a detailed breakdown is asked for.`

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 })
  }

  const { prompt, data } = await req.json()
  if (!prompt) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const context = data
    ? `Current dashboard data (JSON):\n${JSON.stringify(data, null, 2)}`
    : 'No dashboard data available yet.'

  const result = await model.generateContent(`${SYSTEM}\n\n${context}\n\nAthlete question: ${prompt}`)
  const text = result.response.text()

  return NextResponse.json({ answer: text })
}
