import { NextResponse } from 'next/server'

const RACE_DATE = '2026-10-11'
const FORECAST_HORIZON_DAYS = 16 // Open-Meteo max free forecast range

function weatherDesc(code: number): string {
  if (code === 0) return 'Clear'
  if (code <= 3) return 'Partly cloudy'
  if (code <= 48) return 'Fog'
  if (code <= 55) return 'Drizzle'
  if (code <= 65) return 'Rain'
  if (code <= 75) return 'Snow'
  if (code <= 82) return 'Showers'
  if (code <= 99) return 'Thunderstorm'
  return 'Unknown'
}

export async function GET() {
  const daysToRace = Math.ceil((new Date(RACE_DATE).getTime() - Date.now()) / 86400000)

  // Always fetch local (San Jose 95123) current conditions
  const localUrl =
    'https://api.open-meteo.com/v1/forecast' +
    '?latitude=37.2437&longitude=-121.8396' +
    '&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,relative_humidity_2m,uv_index' +
    '&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch' +
    '&timezone=America%2FLos_Angeles'

  // Fetch Budapest race-day forecast when within the forecast horizon
  const budapestUrl =
    daysToRace > 0 && daysToRace <= FORECAST_HORIZON_DAYS
      ? 'https://api.open-meteo.com/v1/forecast' +
        '?latitude=47.4979&longitude=19.0402' +
        `&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,wind_speed_10m_max,weather_code` +
        `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch` +
        `&timezone=Europe%2FBudapest&start_date=${RACE_DATE}&end_date=${RACE_DATE}`
      : null

  try {
    const [localRes, budapestRes] = await Promise.all([
      fetch(localUrl, { cache: 'no-store' }),
      budapestUrl ? fetch(budapestUrl, { cache: 'no-store' }) : Promise.resolve(null),
    ])

    if (!localRes.ok) throw new Error(`Open-Meteo returned HTTP ${localRes.status}`)
    const localJson = await localRes.json()
    const c = localJson.current

    let budapest = null
    if (budapestRes?.ok) {
      const bJson = await budapestRes.json()
      const d = bJson.daily
      if (d?.weather_code?.[0] != null) {
        budapest = {
          tempMaxF: Math.round(d.temperature_2m_max[0]),
          tempMinF: Math.round(d.temperature_2m_min[0]),
          feelsLikeMaxF: Math.round(d.apparent_temperature_max[0]),
          feelsLikeMinF: Math.round(d.apparent_temperature_min[0]),
          windMph: Math.round(d.wind_speed_10m_max[0]),
          precipitation: d.precipitation_sum[0],
          description: weatherDesc(d.weather_code[0]),
        }
      }
    }

    return NextResponse.json({
      local: {
        temp: Math.round(c.temperature_2m),
        feelsLike: Math.round(c.apparent_temperature),
        humidity: c.relative_humidity_2m,
        windMph: Math.round(c.wind_speed_10m),
        precipitation: c.precipitation,
        uvIndex: c.uv_index,
        description: weatherDesc(c.weather_code),
      },
      budapest,
      daysToRace,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
