import type { GameSpec } from '../types'
import { isGameSpec } from './cart'
import { applyModelDraft } from './generate'

const MODEL = 'gemini-2.0-flash'

const SYSTEM = `You design tiny browser arcade games as compact JSON.
Return ONLY JSON, no markdown, with this shape:
{
  "title": "short punchy title",
  "blurb": "one sentence",
  "genre": "collector|shooter|dodge|snake|breakout|platformer|survive",
  "theme": "space|ocean|dungeon|candy|neon|forest|desert|lab",
  "palette": {"bg":"#rrggbb","paper":"#rrggbb","accent":"#rrggbb","player":"#rrggbb","enemy":"#rrggbb","loot":"#rrggbb"},
  "player": {"shape":"square|circle|triangle|ship|diamond","speed":3,"size":18,"hp":3},
  "world": {"wrap":true,"gravity":0,"stars":true},
  "goal": {"kind":"score|survive|collect|clear","target":10,"seconds":60},
  "swarm": {"count":5,"speed":1.8,"behavior":"chase|drift|bounce|swoop"},
  "loot": {"count":8,"value":1}
}
Keep numbers modest so a 960x540 canvas stays playable.`

export async function composeWithGemini(
  prompt: string,
  author: string,
  apiKey: string,
): Promise<GameSpec> {
  const key = apiKey.trim()
  if (!key) throw new Error('No Gemini key')
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 800 },
    }),
  })
  if (!res.ok) {
    throw new Error(`Gemini ${res.status}`)
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  const jsonText = text.replace(/^```json\s*|\s*```$/g, '').trim()
  const draft = JSON.parse(jsonText) as Partial<GameSpec>
  const spec = applyModelDraft(prompt, author, draft)
  if (!isGameSpec(spec)) throw new Error('Model returned an unusable cart')
  return spec
}
