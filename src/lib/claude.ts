import Anthropic from '@anthropic-ai/sdk'
import type { ExtractedEntry, EntryType, EntryPriority } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// ── System prompt Claude uses in all chat interactions ───────
const SYSTEM_PROMPT = `Du bist ein persönlicher Assistent. Du hilfst dem Nutzer dabei, seinen Alltag zu organisieren.

Wenn der Nutzer eine Eingabe macht, die einem dieser Typen entspricht, extrahiere die Daten:
- EVENT: Termin mit Datum/Uhrzeit ("Zahnarzt morgen 14 Uhr")
- TASK: Aufgabe mit optionalem Fälligkeitsdatum ("Steuer bis Freitag")  
- REMINDER: Erinnerung zu einem bestimmten Zeitpunkt ("Mülltonne heute Abend")
- NOTE: Persönliche Information oder Präferenz ("Ich bevorzuge glutenfreie Ernährung")

Antworte immer auf Deutsch. Sei präzise, freundlich und kurz.
Wenn du einen Eintrag erkennst, bestätige ihn konkret (Was hast du gespeichert, wann).
Wenn du nichts erkennst, beantworte die Frage direkt.`

// ── Classify a single user message ──────────────────────────
// Returns structured data if Claude detects a classifiable entry,
// otherwise returns null (it's just a question/command).
export async function classifyMessage(text: string): Promise<ExtractedEntry | null> {
  const today = new Date().toISOString().split('T')[0]

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: `Analysiere den Text und gib NUR ein JSON-Objekt zurück – kein weiterer Text.
Heute ist ${today}.

Schema:
{
  "type": "event" | "task" | "reminder" | "note",
  "title": "kurzer Titel",
  "date": "YYYY-MM-DD oder null",
  "time": "HH:MM oder null",
  "due_date": "YYYY-MM-DD oder null",
  "priority": "low" | "medium" | "high",
  "context": "Kategorie oder null"
}

Wenn der Text KEIN klassifizierbarer Eintrag ist (z.B. eine Frage oder ein Befehl), gib zurück: null`,
    messages: [{ role: 'user', content: text }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
  if (!raw || raw === 'null') return null

  try {
    return JSON.parse(raw) as ExtractedEntry
  } catch {
    return null
  }
}

// ── Full chat response with conversation history ─────────────
export async function chatWithClaude(
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  preferences: Array<{ key: string; value: string }> = []
): Promise<{ reply: string; extracted: ExtractedEntry | null }> {

  // Inject user preferences as additional context
  const prefContext = preferences.length > 0
    ? `\n\nNutzerpräferenzen:\n${preferences.map(p => `- ${p.key}: ${p.value}`).join('\n')}`
    : ''

  const [extracted, chatResponse] = await Promise.all([
    classifyMessage(userMessage),
    anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: SYSTEM_PROMPT + prefContext,
      messages: [
        ...history.slice(-10),  // last 10 messages for context window efficiency
        { role: 'user', content: userMessage },
      ],
    }),
  ])

  const reply = chatResponse.content[0].type === 'text'
    ? chatResponse.content[0].text
    : ''

  return { reply, extracted }
}
