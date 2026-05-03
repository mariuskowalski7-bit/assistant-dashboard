/**
 * insights.ts
 * Sends YouTube analytics data to Claude and returns structured insights.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { Video, AnalyticsTotals, ClaudeInsights } from './types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// Format seconds → '8:24'
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export async function generateInsights(
  video: Video,
  totals: AnalyticsTotals,
  period: '7d' | '28d' | '90d'
): Promise<ClaudeInsights> {

  const periodLabel = period === '7d' ? '7 Tage' : period === '28d' ? '28 Tage' : '90 Tage'

  const prompt = `Du analysierst die YouTube-Performance eines Videos. Antworte NUR als JSON, kein weiterer Text.

Video: "${video.snippet.title}"
Kanal: ${video.snippet.channelTitle}
Veröffentlicht: ${new Date(video.snippet.publishedAt).toLocaleDateString('de-DE')}
Zeitraum: letzte ${periodLabel}

Metriken:
- Views: ${totals.views.toLocaleString('de-DE')}
- Impressionen: ${totals.impressions.toLocaleString('de-DE')}
- CTR: ${totals.ctr.toFixed(1)}%
- Durchschn. Wiedergabe: ${formatDuration(totals.averageViewDuration)} (${totals.averageViewPercentage.toFixed(0)}% des Videos)
- Likes: ${totals.likes}
- Kommentare: ${totals.comments}
- Neue Abonnenten: ${totals.subscribersGained}
- Watchtime gesamt: ${Math.round(totals.estimatedMinutesWatched / 60)}h

Branchenrichtwerte (YouTube-Durchschnitt):
- CTR: 2–5% ist normal, >6% ist sehr gut
- Wiedergabeprozentsatz: >40% ist gut, >60% ist sehr gut
- Likes/Views-Verhältnis: >2% ist gut

Gib zurück:
{
  "summary": "2-3 Sätze Gesamteinschätzung der Performance auf Deutsch",
  "strengths": ["Was gut läuft (max 3 Punkte, konkret, auf Deutsch)"],
  "improvements": ["Was verbessert werden kann (max 3 Punkte, konkret, auf Deutsch)"],
  "suggestion": "Eine konkrete, sofort umsetzbare Handlungsempfehlung auf Deutsch"
}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}'

  try {
    return JSON.parse(raw) as ClaudeInsights
  } catch {
    // Fallback if JSON parse fails
    return {
      summary: 'Analyse konnte nicht geladen werden.',
      strengths: [],
      improvements: [],
      suggestion: 'Bitte versuche es erneut.',
    }
  }
}
